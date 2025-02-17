import { readJsonWorkspace } from '@angular-devkit/core/src/workspace/json/reader';
import { SchematicContext, Tree, UpdateRecorder } from '@angular-devkit/schematics';

import { dirname, normalize } from '@angular-devkit/core';
import { LoggerApi } from '@angular-devkit/core/src/logger';
import { WorkspaceHost } from '@angular-devkit/core/src/workspace';
import { sep } from 'path';
import {
  Block,
  CallExpression,
  canHaveDecorators, createCompilerHost,
  createProgram, forEachChild,
  getDecorators, ImportDeclaration, isBlock, isCallExpression, isClassDeclaration,
  isClassExpression, isExpressionStatement, isImportClause, isImportDeclaration,
  isImportSpecifier,
  isNamedImports,
  isReturnStatement,
  isTypeParameterDeclaration,
  isTypeReferenceNode, LeftHandSideExpression,
  Node,
  parseJsonConfigFileContent,
  readConfigFile, SourceFile,
  SyntaxKind,
  sys
} from 'typescript';
const { keys } = Object;

const MethodNames = [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'JSONP' ] as const;

export const updateToV2 = () => async ( tree: Tree, { logger }: SchematicContext ) =>
{
  const
    replacements = {
      AbstractApiClient: 'AbstractRESTClient',
      Error: 'RESTClientError',
      Type: 'ResponseType',
      return: 'return NEVER',
    },
    replacementKeys = keys( replacements ),
    replace = ( node: Node, recorder: UpdateRecorder ) => {
      const nodeValue = node.getText().trim();
      if ( !replacementKeys.includes( nodeValue ) ) return false;
      const start = node.getStart();
      recorder.remove( start, node.getEnd() - start );
      return recorder.insertLeft( start, replacements[nodeValue as keyof typeof replacements] );
    };
  const filterReplacements = ( identifier: Node ) => replacementKeys.includes( identifier.getText().trim() );
  await forEachProjectFile( tree, logger, ( sourceFile, recorder ) =>
  {
    let
      decoratorCalls: LeftHandSideExpression[] = [],
      derivedClasses: Node[] = [],
      parameterInheritance: Node[] = [],
      returnStatements: Node[] = [],
      hasPackageImports = false,
      rxjsImportNode: Node|undefined = undefined;

    const gatherPossibleReplacements = ( node: Node ) => {
      // gather decorator calls (decorators called as a function), check later if has imports
      decoratorCalls = [
        ...decoratorCalls,
        ...( isExpressionStatement( node ) && node.getChildren()
          .filter( child => isCallExpression( child ) )
          .map( child => ( ( child as CallExpression )?.expression as CallExpression )?.expression )
          .filter( Boolean ) || []
        ).filter( filterReplacements )
      ];
      // gather decorator usage (with @ notation), check later if has imports
      const currentDecoratorCalls = canHaveDecorators( node ) && ( getDecorators( node ) || [] )
        ?.reduce( ( decorators, decorator ) => [ ...decorators, ( decorator.expression as CallExpression )?.expression ], [] as LeftHandSideExpression[] )
        .filter( Boolean ) || [];
      // also replace return statements if void
      if ( currentDecoratorCalls.length && currentDecoratorCalls.filter( decorator => MethodNames.includes( decorator.getText() as typeof MethodNames[number] ) ).length ) {
        const [ returnStatement, _semicolon, ...rest ] = ( node.getChildren().find( child => isBlock( child ) ) as Block )?.statements.find( statement => isReturnStatement( statement ) )?.getChildren() || [];
        !rest.length && ( returnStatements = [ ...returnStatements, returnStatement ] );
      }
      decoratorCalls = [
        ...decoratorCalls,
        ...( currentDecoratorCalls ).filter( filterReplacements )
      ];
      // gather derived classes, check later if has imports
      derivedClasses = [
        ...derivedClasses,
        ...( ( isClassDeclaration( node ) || isClassExpression( node ) )
          ? node.heritageClauses?.find( ( { token } ) => token === SyntaxKind.ExtendsKeyword )?.types?.filter( filterReplacements ) || []
          : [] )
      ];
      // gather parameter inheritance
      parameterInheritance = [
        ...parameterInheritance,
        ...( isTypeParameterDeclaration( node )
          ? node.getChildren().filter( node => isTypeReferenceNode( node ) && filterReplacements( node ) )
          : [] )
      ];
      if ( node.getChildCount() > 0 )
        node.getChildren().forEach( childNode => gatherPossibleReplacements( childNode ) );
    };

    forEachChild( sourceFile, node =>
    {
      gatherPossibleReplacements( node );
      // replace imports

      if ( !isImportDeclaration( node ) ) return;
      if ( node.moduleSpecifier?.getFullText()?.match( /rxjs('|")$/ ) ) rxjsImportNode = node;
      if ( !node.moduleSpecifier?.getFullText()?.match( /@gzm\/ng-rest-client/ ) ) return;
      node.importClause?.namedBindings?.forEachChild( specifier => {
        if ( !isImportSpecifier( specifier ) ) return;
        // `specifier.propertyName` means it's an alias
        if ( specifier.name && !specifier.propertyName ) hasPackageImports = true;
        replace( specifier.propertyName || specifier.name, recorder );
      } );
    } );
    if ( !hasPackageImports ) return [];
    // add NEVER import if not present
    if ( returnStatements ) {
      if ( !!rxjsImportNode ) {
        const rxjsImportSyntaxList = ( rxjsImportNode as unknown as ImportDeclaration )
          .getChildren().find( child => isImportClause( child ) )
          ?.getChildren().find( child => isNamedImports( child ) )
          ?.getChildren().find( child => child.kind === SyntaxKind.SyntaxList );
        !rxjsImportSyntaxList?.getChildren().find( child => child.getText() === 'NEVER' ) && recorder.insertRight( rxjsImportSyntaxList!.getEnd(), ', NEVER' );
      } else {
        recorder.insertLeft( sourceFile.getStart(), `import { NEVER } from 'rxjs';\n` );
      }
    }
    // replace decorators and inheritance
    return [ ...decoratorCalls, ...derivedClasses, ...parameterInheritance, ...returnStatements ].map( node => replace( node, recorder ) ).filter( Boolean );
  } );
  return tree;
};

const forEachProjectFile = async ( tree: Tree, logger: LoggerApi, updateFunction: ( sourceFile: SourceFile, recorder: UpdateRecorder ) => any[] ) => {
  const
    angularJson = [ '/angular.json', '/.angular.json' ].find( filePath => tree.exists( filePath ) ),
    workspaceConfigBuffer = tree.read( angularJson! );
  if ( !workspaceConfigBuffer || !angularJson ) throw new Error( 'Could not find angular.json' );
  const projects = ( await readJsonWorkspace( angularJson, { readFile: async filePath => tree.read( filePath )!.toString(), } as WorkspaceHost ) ).projects;
  // keep track of already seen files, because the same file might be included in multiple projects and updates might be called multiple times resulting in bogus code
  const seen = new Set<string>();
  projects.forEach( ( project, projectName ) => [ 'build', 'test' ].forEach( target =>
  {
    const tsconfigPath = normalize( project.targets.get( target )?.options?.tsConfig as string || '' );
    if ( !tsconfigPath ) {
      logger.warn( `Skipping migration for project ${projectName}:${target}` );
      return;
    }
    const
      { config } = readConfigFile( tsconfigPath, path => tree.read( normalize( path ) )!.toString() ),
      parsed = parseJsonConfigFileContent( config, sys, dirname( tsconfigPath ) ),
      program = createProgram( parsed.fileNames, parsed.options, createCompilerHost( parsed.options, true ) ),
      sourceFiles = program.getSourceFiles().filter( file => !file.isDeclarationFile && !program.isSourceFileFromExternalLibrary( file ) );
    sourceFiles.forEach( sourceFile => {
      if ( seen.has( sourceFile.fileName ) ) return;
      const recorder = tree.beginUpdate( sourceFile.fileName.replace( new RegExp( `^${program.getCurrentDirectory()}` ), '' ).replace( new RegExp( `^${sep}` ), '' ) );
      if ( !( updateFunction( sourceFile, recorder ) ).length ) return;
      tree.commitUpdate( recorder );
      seen.add( sourceFile.fileName );
    } );
  } ) );
};
