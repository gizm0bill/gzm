import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { sep } from 'path';
import { sys } from 'typescript';

describe( 'update', () => {

  let runner: SchematicTestRunner;
  let appTree: UnitTestTree;

  beforeEach( async () => {
    runner = new SchematicTestRunner( 'ng-rest-client', require.resolve( '../migration.json' ) );
    appTree = await runner.runExternalSchematic( '@schematics/angular', 'workspace',
      { name: 'workspace', version: '0', newProjectRoot: 'schematics/ng-update/test' } );
    appTree = await runner.runExternalSchematic( '@schematics/angular', 'application', { name: 'application', }, appTree );
  } );

  it( 'should update the project correctly', async () => {
    const appModuleFile = appTree.files.find( file => file.endsWith( 'app.module.ts' ) );
    const appPath = appModuleFile?.replace( /\/app\.module\.ts$/, '' ).replace( new RegExp( `^${sep}` ), '' );
    appTree.create( `${appPath}/api.service.ts`, sys.readFile( sys.resolvePath( `${appPath}/api.service.ts` ) )! );
    const tree = await runner.runSchematic( 'migration-v2', { }, appTree );
    expect( tree.readContent( `${appPath}/api.service.ts` ).replace(/\s+/g, ' ') ).toBe( sys.readFile( sys.resolvePath( `${appPath}/api.service.expected.ts` ) )!.replace(/\s+/g, ' ') );
  } );
} );
