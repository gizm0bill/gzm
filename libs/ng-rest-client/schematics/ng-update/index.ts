import { readJsonWorkspace } from '@angular-devkit/core/src/workspace/json/reader';
import { SchematicContext, Tree, UpdateRecorder } from '@angular-devkit/schematics';

import { dirname, normalize } from '@angular-devkit/core';
import { LoggerApi } from '@angular-devkit/core/src/logger';
import { WorkspaceHost } from '@angular-devkit/core/src/workspace';
import { sep } from 'path';
import {
  CallExpression,
  canHaveDecorators, createCompilerHost,
  createProgram,
  ExpressionWithTypeArguments,
  forEachChild,
  getDecorators, isCallExpression, isClassDeclaration,
  isClassExpression, isExpressionStatement, isImportDeclaration,
  isImportSpecifier,
  LeftHandSideExpression,
  Node,
  parseJsonConfigFileContent,
  readConfigFile,
  SourceFile,
  SyntaxKind,
  sys
} from 'typescript';
const { keys } = Object;


export const updateToV2 = () => async ( tree: Tree, { logger }: SchematicContext ) =>
{
  const
    replacements = {
      AbstractApiClient: 'AbstractRESTClient',
      Error: 'RESTClientError',
    },
    replacementKeys = keys( replacements ),
    replace = ( node: Node, recorder: UpdateRecorder ) => {
      const nodeValue = node.getText().trim();
      if ( !replacementKeys.includes( nodeValue ) ) return;
      const start = node.getStart();
      recorder.remove( start, node.getEnd() - start );
      recorder.insertLeft( start, replacements[nodeValue as keyof typeof replacements] );
    };
  const filterReplacements = ( identifier: Node ) => replacementKeys.includes( identifier.getText().trim() );
  await forEachProjectFile( tree, logger, ( sourceFile, recorder ) => {
    let
      decoratorCalls: LeftHandSideExpression[] = [],
      derivedClasses: ExpressionWithTypeArguments[] = [],
      hasPackageImports = false;

    forEachChild( sourceFile, node =>
    {
      // TODO: export const errorHandler = <T extends AbstractApiClient>( _a: T, error: HttpErrorResponse, _: any, caught: Observable<any> ): Observable<string> =>
      /* TODO:
        export const factory = ( location: string ): any =>
        {
          class C extends ApiSrv
          {
            @GET( '…' )
            smth(): Observable<HttpResponse<any>> { return; }
          }
          Error( errorHandler )( C );
          BaseUrl( () => of( '…' ) )( C );
          return new C();
        };
      */
      // TODO: system Error without import from our lib - export class AuthTokenExpiredError extends Error {}
      // gather decorator calls, check later if has imports
      decoratorCalls = [
        ...decoratorCalls,
        ...( isExpressionStatement( node ) && node.getChildren()
          .filter( child => isCallExpression( child ) )
          .map( child => ( ( child as CallExpression )?.expression as CallExpression )?.expression )
          .filter( Boolean ) || []
        ).filter( filterReplacements )
      ]
      // gather decorator usage, check later if has imports
      decoratorCalls = [
        ...decoratorCalls,
        ...( canHaveDecorators( node ) && ( getDecorators( node ) || [] )?.reduce( ( decorators, decorator ) =>
          [ ...decorators, ( decorator.expression as CallExpression )?.expression ],
          []
        ).filter( Boolean ) || [] ).filter( filterReplacements )
      ];
      // gather derived classes, check later if has imports
      derivedClasses = [
        ...derivedClasses,
        ...( ( isClassDeclaration( node ) || isClassExpression( node ) )
          ? node.heritageClauses?.find( ( { token } ) => token === SyntaxKind.ExtendsKeyword )?.types?.filter( filterReplacements ) || []
          : [] )
      ];
      // replace imports
      if ( !isImportDeclaration( node ) || !node.moduleSpecifier?.getFullText()?.match( /@gzm\/ng-rest-client/ ) ) return;
      node.importClause?.namedBindings?.forEachChild( specifier => {
        if ( !isImportSpecifier( specifier ) ) return;
        if ( specifier.name && !specifier.propertyName ) hasPackageImports = true;
        replace( specifier.propertyName || specifier.name, recorder );
      } );
    } );
    if ( !hasPackageImports ) return;
    // replace decorators and inheritance
    [ ...decoratorCalls, ...derivedClasses ].forEach( node => replace( node, recorder ) );
  } );
  return tree;
};

const forEachProjectFile = async ( tree: Tree, logger: LoggerApi, updateFunction: ( sourceFile: SourceFile, recorder: UpdateRecorder ) => unknown ) => {
  const
    angularJson = [ '/angular.json', '/.angular.json' ].find( filePath => tree.exists( filePath ) ),
    workspaceConfigBuffer = tree.read( angularJson! );
  if ( !workspaceConfigBuffer || !angularJson ) throw new Error( 'Could not find angular.json' );
  const projects = ( await readJsonWorkspace( angularJson, { readFile: async filePath => tree.read( filePath )!.toString(), } as WorkspaceHost ) ).projects;
  projects.forEach( ( project, projectName ) => [ 'build', 'test' ].forEach( target =>
  {
    const tsconfigPath = normalize( project.targets.get( target )?.options?.tsConfig as string );
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
      const recorder = tree.beginUpdate( sourceFile.fileName.replace( new RegExp( `^${program.getCurrentDirectory()}` ), '' ).replace( new RegExp( `^${sep}` ), '' ) );
      updateFunction( sourceFile, recorder );
      tree.commitUpdate( recorder );
    } );
  } ) );
};
