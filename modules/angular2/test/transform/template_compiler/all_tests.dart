library angular2.test.transform.template_compiler.all_tests;

import 'dart:async';
import 'package:barback/barback.dart';
import 'package:angular2/src/dom/html_adapter.dart';
import 'package:angular2/src/render/api.dart';
import 'package:angular2/src/transform/common/asset_reader.dart';
import 'package:angular2/src/transform/common/parser.dart';
import 'package:angular2/src/transform/template_compiler/directive_metadata_reader.dart';
import 'package:angular2/src/transform/template_compiler/generator.dart';
import 'package:dart_style/dart_style.dart';
import 'package:guinness/guinness.dart';

import '../common/read_file.dart';

var formatter = new DartFormatter();

void allTests() {
  Html5LibDomAdapter.makeCurrent();
  AssetReader reader = new TestAssetReader();
  var parser = new Parser(reader);

  it('should parse simple expressions in inline templates.', () async {
    var inputPath =
        'template_compiler/inline_expression_files/hello.ng_deps.dart';
    var expected = readFile(
        'template_compiler/inline_expression_files/expected/hello.ng_deps.dart');
    var output = await processTemplates(reader, new AssetId('a', inputPath));
    _formatThenExpectEquals(output, expected);
  });

  it('should parse simple methods in inline templates.', () async {
    var inputPath = 'template_compiler/inline_method_files/hello.ng_deps.dart';
    var expected = readFile(
        'template_compiler/inline_method_files/expected/hello.ng_deps.dart');
    var output = await processTemplates(reader, new AssetId('a', inputPath));
    _formatThenExpectEquals(output, expected);
  });

  it('should parse simple expressions in linked templates.', () async {
    var inputPath = 'template_compiler/url_expression_files/hello.ng_deps.dart';
    var expected = readFile(
        'template_compiler/url_expression_files/expected/hello.ng_deps.dart');
    var output = await processTemplates(reader, new AssetId('a', inputPath));
    _formatThenExpectEquals(output, expected);
  });

  it('should parse simple methods in linked templates.', () async {
    var inputPath = 'template_compiler/url_method_files/hello.ng_deps.dart';
    var expected = readFile(
        'template_compiler/url_method_files/expected/hello.ng_deps.dart');
    var output = await processTemplates(reader, new AssetId('a', inputPath));
    _formatThenExpectEquals(output, expected);
  });

  describe('DirectiveMetadataReader', () {
    Future<DirectiveMetadata> readSingleMetadata(inputPath) async {
      var ngDeps = await parser.parse(new AssetId('a', inputPath));
      var metadata = readDirectiveMetadata(ngDeps.registeredTypes.first);
      expect(metadata.length).toEqual(1);
      return metadata.first;
    }

    it('should parse selectors', () async {
      var metadata = await readSingleMetadata(
          'template_compiler/directive_metadata_files/selector.ng_deps.dart');
      expect(metadata.selector).toEqual('hello-app');
    });

    it('should parse compile children values', () async {
      var metadata = await readSingleMetadata('template_compiler/'
          'directive_metadata_files/compile_children.ng_deps.dart');
      expect(metadata.compileChildren).toBeTrue();

      metadata = await readSingleMetadata(
          'template_compiler/directive_metadata_files/selector.ng_deps.dart');
      expect(metadata.compileChildren).toBeFalse();
    });

    it('should parse properties.', () async {
      var metadata = await readSingleMetadata('template_compiler/'
          'directive_metadata_files/properties.ng_deps.dart');
      expect(metadata.properties).toBeNotNull();
      expect(metadata.properties.length).toBe(2);
      expect(metadata.properties).toContain('key1');
      expect(metadata.properties['key1']).toEqual('val1');
      expect(metadata.properties).toContain('key2');
      expect(metadata.properties['key2']).toEqual('val2');
    });

    it('should parse host listeners.', () async {
      var metadata = await readSingleMetadata('template_compiler/'
          'directive_metadata_files/host_listeners.ng_deps.dart');
      expect(metadata.hostListeners).toBeNotNull();
      expect(metadata.hostListeners.length).toBe(2);
      expect(metadata.hostListeners).toContain('change');
      expect(metadata.hostListeners['change']).toEqual('onChange(\$event)');
      expect(metadata.hostListeners).toContain('keyDown');
      expect(metadata.hostListeners['keyDown']).toEqual('onKeyDown(\$event)');
    });
  });
}

void _formatThenExpectEquals(String actual, String expected) {
  expect(formatter.format(actual)).toEqual(formatter.format(expected));
}
