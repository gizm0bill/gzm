import { readJsonWorkspace } from '@angular-devkit/core/src/workspace/json/reader';
import { SchematicContext, Tree } from '@angular-devkit/schematics';

import { dirname, normalize } from '@angular-devkit/core';
import { WorkspaceHost } from '@angular-devkit/core/src/workspace';
import * as ts from 'typescript';
import * as path from 'path';

export function updateToV2() {
  return async ( tree: Tree, { logger }: SchematicContext ) => {
    const projects = await getProjects( tree );
    projects.forEach( project => {
      [ 'build', 'test' ].forEach( target => {
        const tsconfigPath = normalize( project.targets.get( target )?.options?.tsConfig as string );
        if ( !tsconfigPath ) {
          logger.warn( `Skipping migration for project ${project.root}:${target}` )
        }
        const { config } = ts.readConfigFile( tsconfigPath!, p => tree.read( normalize( p ) )!.toString() );
        const parsed = ts.parseJsonConfigFileContent( config, ts.sys, dirname( tsconfigPath! ) );
        const program = ts.createProgram( parsed.fileNames, parsed.options, ts.createCompilerHost( parsed.options, true ) );
        const sourceFiles = program.getSourceFiles().filter( f => !f.isDeclarationFile && !program.isSourceFileFromExternalLibrary( f ) );
        sourceFiles.forEach( sourceFile => {
          // some bug in ts, getting files with full path
          const recorder = tree.beginUpdate( sourceFile.fileName.replace( new RegExp( `^${program.getCurrentDirectory()}` ), '' ).replace( `^${path.sep}`, '' ) );
          ts.forEachChild( sourceFile, ( node ) => {
            if ( ts.isImportDeclaration( node ) && node.moduleSpecifier?.getFullText()?.match( /@gzm\/ng-rest-client/ ) ) {
              node.importClause?.namedBindings?.forEachChild( ( specifier ) => {
                if ( ts.isImportSpecifier( specifier ) ) {
                  if ( specifier.propertyName ) {
                    recorder.remove( specifier.propertyName.getStart(), specifier.propertyName.getEnd() - specifier.propertyName.getStart() );
                    recorder.insertLeft( specifier.propertyName.getStart(), 'Wtf' );
                  }
                }
              } );
            }
          } );
          tree.commitUpdate( recorder );
        } );
      } );
    } );
    return tree;
  };
}

const getProjects = async ( tree: Tree ) => {
  const path = ['/angular.json', '/.angular.json'].find( filePath => tree.exists( filePath ) );
  const workspaceConfigBuffer = tree.read( path! );
  if ( !workspaceConfigBuffer || !path ) {
    throw new Error( 'Could not find angular.json' );
  }
  return ( await readJsonWorkspace( path, { readFile: async filePath => tree.read( filePath )!.toString(), } as WorkspaceHost ) ).projects;
}
