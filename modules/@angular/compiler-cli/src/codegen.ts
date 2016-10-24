/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * Transform template html and css into executable code.
 * Intended to be used in a build step.
 */
import * as compiler from '@angular/compiler';
import {ViewEncapsulation} from '@angular/core';
import {AngularCompilerOptions, NgcCliOptions} from '@angular/tsc-wrapped';
import * as path from 'path';
import * as ts from 'typescript';

import {PathMappedReflectorHost} from './path_mapped_reflector_host';
import {Console} from './private_import_core';
import {ReflectorHost, ReflectorHostContext} from './reflector_host';
import {StaticAndDynamicReflectionCapabilities} from './static_reflection_capabilities';
import {StaticReflector, StaticReflectorHost, StaticSymbol} from './static_reflector';

const nodeFs = require('fs');

const GENERATED_FILES = /\.ngfactory\.ts$|\.css\.ts$|\.css\.shim\.ts$/;
const GENERATED_OR_DTS_FILES = /\.d\.ts$|\.ngfactory\.ts$|\.css\.ts$|\.css\.shim\.ts$/;

const PREAMBLE = `/**
 * This file is generated by the Angular 2 template compiler.
 * Do not edit.
 */
 /* tslint:disable */

`;

export class CodeGenerator {
  constructor(
      private options: AngularCompilerOptions, private program: ts.Program,
      public host: ts.CompilerHost, private staticReflector: StaticReflector,
      private compiler: compiler.OfflineCompiler, private reflectorHost: StaticReflectorHost) {}

  // Write codegen in a directory structure matching the sources.
  private calculateEmitPath(filePath: string): string {
    let root = this.options.basePath;
    for (const eachRootDir of this.options.rootDirs || []) {
      if (this.options.trace) {
        console.log(`Check if ${filePath} is under rootDirs element ${eachRootDir}`);
      }
      if (path.relative(eachRootDir, filePath).indexOf('.') !== 0) {
        root = eachRootDir;
      }
    }

    // transplant the codegen path to be inside the `genDir`
    let relativePath: string = path.relative(root, filePath);
    while (relativePath.startsWith('..' + path.sep)) {
      // Strip out any `..` path such as: `../node_modules/@foo` as we want to put everything
      // into `genDir`.
      relativePath = relativePath.substr(3);
    }

    return path.join(this.options.genDir, relativePath);
  }

  codegen(options: {transitiveModules: boolean}): Promise<any> {
    const staticSymbols =
        extractProgramSymbols(this.program, this.staticReflector, this.reflectorHost, this.options);

    return this.compiler.compileModules(staticSymbols, options).then(generatedModules => {
      generatedModules.forEach(generatedModule => {
        const sourceFile = this.program.getSourceFile(generatedModule.fileUrl);
        const emitPath = this.calculateEmitPath(generatedModule.moduleUrl);
        this.host.writeFile(
            emitPath, PREAMBLE + generatedModule.source, false, () => {}, [sourceFile]);
      });
    });
  }

  static create(
      options: AngularCompilerOptions, cliOptions: NgcCliOptions, program: ts.Program,
      compilerHost: ts.CompilerHost, reflectorHostContext?: ReflectorHostContext,
      resourceLoader?: compiler.ResourceLoader, reflectorHost?: ReflectorHost): CodeGenerator {
    resourceLoader = resourceLoader || {
      get: (s: string) => {
        if (!compilerHost.fileExists(s)) {
          // TODO: We should really have a test for error cases like this!
          throw new Error(`Compilation failed. Resource file not found: ${s}`);
        }
        return Promise.resolve(compilerHost.readFile(s));
      }
    };
    const transFile = cliOptions.i18nFile;
    const locale = cliOptions.locale;
    let transContent: string = '';
    if (transFile) {
      if (!locale) {
        throw new Error(
            `The translation file (${transFile}) locale must be provided. Use the --locale option.`);
      }
      transContent = nodeFs.readFileSync(transFile, 'utf8');
    }

    const urlResolver: compiler.UrlResolver = compiler.createOfflineCompileUrlResolver();
    if (!reflectorHost) {
      const usePathMapping = !!options.rootDirs && options.rootDirs.length > 0;
      reflectorHost = usePathMapping ?
          new PathMappedReflectorHost(program, compilerHost, options, reflectorHostContext) :
          new ReflectorHost(program, compilerHost, options, reflectorHostContext);
    }
    const staticReflector = new StaticReflector(reflectorHost);
    StaticAndDynamicReflectionCapabilities.install(staticReflector);
    const htmlParser =
        new compiler.I18NHtmlParser(new compiler.HtmlParser(), transContent, cliOptions.i18nFormat);
    const config = new compiler.CompilerConfig({
      genDebugInfo: options.debug === true,
      defaultEncapsulation: ViewEncapsulation.Emulated,
      logBindingUpdate: false,
      useJit: false
    });
    const normalizer =
        new compiler.DirectiveNormalizer(resourceLoader, urlResolver, htmlParser, config);
    const expressionParser = new compiler.Parser(new compiler.Lexer());
    const elementSchemaRegistry = new compiler.DomElementSchemaRegistry();
    const console = new Console();
    const tmplParser = new compiler.TemplateParser(
        expressionParser, elementSchemaRegistry, htmlParser, console, []);
    const resolver = new compiler.CompileMetadataResolver(
        new compiler.NgModuleResolver(staticReflector),
        new compiler.DirectiveResolver(staticReflector), new compiler.PipeResolver(staticReflector),
        elementSchemaRegistry, staticReflector);
    // TODO(vicb): do not pass cliOptions.i18nFormat here
    const offlineCompiler = new compiler.OfflineCompiler(
        resolver, normalizer, tmplParser, new compiler.StyleCompiler(urlResolver),
        new compiler.ViewCompiler(config, elementSchemaRegistry),
        new compiler.DirectiveWrapperCompiler(
            config, expressionParser, elementSchemaRegistry, console),
        new compiler.NgModuleCompiler(), new compiler.TypeScriptEmitter(reflectorHost),
        cliOptions.locale, cliOptions.i18nFormat);

    return new CodeGenerator(
        options, program, compilerHost, staticReflector, offlineCompiler, reflectorHost);
  }
}

export function extractProgramSymbols(
    program: ts.Program, staticReflector: StaticReflector, reflectorHost: StaticReflectorHost,
    options: AngularCompilerOptions): StaticSymbol[] {
  // Compare with false since the default should be true
  const skipFileNames =
      options.generateCodeForLibraries === false ? GENERATED_OR_DTS_FILES : GENERATED_FILES;

  const staticSymbols: StaticSymbol[] = [];

  program.getSourceFiles()
      .filter(sourceFile => !skipFileNames.test(sourceFile.fileName))
      .forEach(sourceFile => {
        const absSrcPath = reflectorHost.getCanonicalFileName(sourceFile.fileName);

        const moduleMetadata = staticReflector.getModuleMetadata(absSrcPath);
        if (!moduleMetadata) {
          console.log(`WARNING: no metadata found for ${absSrcPath}`);
          return;
        }

        const metadata = moduleMetadata['metadata'];

        if (!metadata) {
          return;
        }

        for (const symbol of Object.keys(metadata)) {
          if (metadata[symbol] && metadata[symbol].__symbolic == 'error') {
            // Ignore symbols that are only included to record error information.
            continue;
          }
          staticSymbols.push(reflectorHost.findDeclaration(absSrcPath, symbol, absSrcPath));
        }
      });

  return staticSymbols;
}