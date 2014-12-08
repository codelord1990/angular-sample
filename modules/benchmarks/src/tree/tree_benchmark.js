import {benchmark, benchmarkStep} from 'benchpress/benchpress';

import {ChangeDetector} from 'change_detection/change_detector';
import {Parser} from 'change_detection/parser/parser';
import {Lexer} from 'change_detection/parser/lexer';

import {bootstrap, Component, Template, TemplateConfig, ViewPort, Compiler} from 'core/core';

import {CompilerCache} from 'core/compiler/compiler';
import {DirectiveMetadataReader} from 'core/compiler/directive_metadata_reader';
import {TemplateLoader} from 'core/compiler/template_loader';

import {reflector} from 'reflection/reflection';

var MAX_DEPTH = 9;

function setup() {
  // TODO: Put the general calls to reflector.register... in a shared file
  // as they are needed in all benchmarks...

  reflector.registerType(AppComponent, {
    'factory': () => new AppComponent(),
    'parameters': [],
    'annotations' : [new Component({
      selector: 'app',
      template: new TemplateConfig({
        directives: [TreeComponent],
        inline: `<tree [data]='initData'></tree>`
      })
    })]
  });

  reflector.registerType(TreeComponent, {
    'factory': () => new TreeComponent(),
    'parameters': [],
    'annotations' : [new Component({
      selector: 'tree',
      bind: {
        'data': 'data'
      },
      template: new TemplateConfig({
          directives: [TreeComponent, NgIf],
          inline: `
    <span> {{data.value}}
       <span template='ng-if data.left != null'><tree [data]='data.left'></span>
       <span template='ng-if data.right != null'><tree [data]='data.right'></span>
    </span>`
      })
    })]
  });

  reflector.registerType(NgIf, {
    'factory': (vp) => new NgIf(vp),
    'parameters': [[ViewPort]],
    'annotations' : [new Template({
      selector: '[ng-if]',
      bind: {
        'ng-if': 'ngIf'
      }
    })]
  });

  reflector.registerType(Compiler, {
    'factory': (templateLoader, reader, parser, compilerCache) => new Compiler(templateLoader, reader, parser, compilerCache),
    'parameters': [[TemplateLoader], [DirectiveMetadataReader], [Parser], [CompilerCache]],
    'annotations': []
  });

  reflector.registerType(CompilerCache, {
    'factory': () => new CompilerCache(),
    'parameters': [],
    'annotations': []
  });

  reflector.registerType(Parser, {
    'factory': (lexer) => new Parser(lexer),
    'parameters': [[Lexer]],
    'annotations': []
  });

  reflector.registerType(TemplateLoader, {
    'factory': () => new TemplateLoader(),
    'parameters': [],
    'annotations': []
  });

  reflector.registerType(DirectiveMetadataReader, {
    'factory': () => new DirectiveMetadataReader(),
    'parameters': [],
    'annotations': []
  });

  reflector.registerType(Lexer, {
    'factory': () => new Lexer(),
    'parameters': [],
    'annotations': []
  });


  reflector.registerGetters({
    'value': (a) => a.value,
    'left': (a) => a.left,
    'right': (a) => a.right,
    'initData': (a) => a.initData,
    'data': (a) => a.data
  });

  reflector.registerSetters({
    'value': (a,v) => a.value = v,
    'left': (a,v) => a.left = v,
    'right': (a,v) => a.right = v,
    'initData': (a,v) => a.initData = v,
    'data': (a,v) => a.data = v,
    'ngIf': (a,v) => a.ngIf = v
  });

  return bootstrap(AppComponent);
}

export function main() {
  var app;
  var changeDetector;
  setup().then((injector) => {
    changeDetector = injector.get(ChangeDetector);
    app = injector.get(AppComponent);
  });

  benchmark(`tree benchmark`, function() {
    var count = 0;

    benchmarkStep(`destroyDom binary tree of depth ${MAX_DEPTH}`, function() {
      // TODO: We need an initial value as otherwise the getter for data.value will fail
      // --> this should be already caught in change detection!
      app.initData = new TreeNode('', null, null);
      changeDetector.detectChanges();
    });

    benchmarkStep(`createDom binary tree of depth ${MAX_DEPTH}`, function() {
      var maxDepth = 9;
      var values = count++ % 2 == 0 ?
        ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*'] :
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', '-'];

      app.initData = buildTree(maxDepth, values, 0);
      changeDetector.detectChanges();
    });

  });
}

class TreeNode {
  value:string;
  left:TreeNode;
  right:TreeNode;
  constructor(value, left, right) {
    this.value = value;
    this.left = left;
    this.right = right;
  }
}

function buildTree(maxDepth, values, curDepth) {
  if (maxDepth === curDepth) return new TreeNode('', null, null);
  return new TreeNode(
      values[curDepth],
      buildTree(maxDepth, values, curDepth+1),
      buildTree(maxDepth, values, curDepth+1));
}

class AppComponent {
  initData:TreeNode;
  constructor() {
    // TODO: We need an initial value as otherwise the getter for data.value will fail
    // --> this should be already caught in change detection!
    this.initData = new TreeNode('', null, null);
  }
}

// TODO: Move this into a reusable directive in the 'core' module!
class NgIf {
  _viewPort:ViewPort;
  constructor(viewPort:ViewPort) {
    this._viewPort = viewPort;
  }
  set ngIf(value:boolean) {
    if (this._viewPort.length > 0) {
      this._viewPort.remove(0);
    }
    if (value) {
      this._viewPort.create();
    }
  }
}

class TreeComponent {
  data:TreeNode;
}

