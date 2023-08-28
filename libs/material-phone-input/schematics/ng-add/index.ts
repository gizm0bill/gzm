import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';

export const ngAdd =(): Rule => {
  return ( tree: Tree, context: SchematicContext ) => {
    context.addTask( new NodePackageInstallTask() );
    return tree;
  };
}
