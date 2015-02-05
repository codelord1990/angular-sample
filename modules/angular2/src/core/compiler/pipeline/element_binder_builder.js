import {int, isPresent, isBlank, Type, BaseException, StringWrapper, stringify} from 'angular2/src/facade/lang';
import {Element, DOM} from 'angular2/src/facade/dom';
import {ListWrapper, List, MapWrapper, StringMapWrapper} from 'angular2/src/facade/collection';

import {reflector} from 'angular2/src/reflection/reflection';

import {Parser, ProtoChangeDetector} from 'angular2/change_detection';

import {Component, Directive} from '../../annotations/annotations';
import {DirectiveMetadata} from '../directive_metadata';
import {ProtoView, ElementPropertyMemento, DirectivePropertyMemento} from '../view';
import {ProtoElementInjector} from '../element_injector';
import {ElementBinder} from '../element_binder';

import {CompileStep} from './compile_step';
import {CompileElement} from './compile_element';
import {CompileControl} from './compile_control';

const CLASS_PREFIX = 'class.';
var classSettersCache = StringMapWrapper.create();

function classSetterFactory(className:string) {
  var setterFn = StringMapWrapper.get(classSettersCache, className);

  if (isBlank(setterFn)) {
    setterFn = function(element:Element, value) {
      if (value) {
        DOM.addClass(element, className);
      } else {
        DOM.removeClass(element, className);
      }
    };
    StringMapWrapper.set(classSettersCache, className, setterFn);
  }

  return setterFn;
}

/**
 * Creates the ElementBinders and adds watches to the
 * ProtoChangeDetector.
 *
 * Fills:
 * - CompileElement#inheritedElementBinder
 *
 * Reads:
 * - (in parent) CompileElement#inheritedElementBinder
 * - CompileElement#hasBindings
 * - CompileElement#inheritedProtoView
 * - CompileElement#inheritedProtoElementInjector
 * - CompileElement#textNodeBindings
 * - CompileElement#propertyBindings
 * - CompileElement#eventBindings
 * - CompileElement#decoratorDirectives
 * - CompileElement#componentDirective
 * - CompileElement#templateDirective
 *
 * Note: This actually only needs the CompileElements with the flags
 * `hasBindings` and `isViewRoot`,
 * and only needs the actual HTMLElement for the ones
 * with the flag `isViewRoot`.
 */
export class ElementBinderBuilder extends CompileStep {
  process(parent:CompileElement, current:CompileElement, control:CompileControl) {
    var elementBinder = null;
    if (current.hasBindings) {
      var protoView = current.inheritedProtoView;
      elementBinder = protoView.bindElement(current.inheritedProtoElementInjector,
        current.componentDirective, current.templateDirective);

      if (isPresent(current.textNodeBindings)) {
        this._bindTextNodes(protoView, current);
      }
      if (isPresent(current.propertyBindings)) {
        this._bindElementProperties(protoView, current);
      }
      if (isPresent(current.eventBindings)) {
        this._bindEvents(protoView, current);
      }
      this._bindDirectiveProperties(current.getAllDirectives(), current);
    } else if (isPresent(parent)) {
      elementBinder = parent.inheritedElementBinder;
    }
    current.inheritedElementBinder = elementBinder;
  }

  _bindTextNodes(protoView, compileElement) {
    MapWrapper.forEach(compileElement.textNodeBindings, (expression, indexInParent) => {
      protoView.bindTextNode(indexInParent, expression);
    });
  }

  _bindElementProperties(protoView, compileElement) {
    MapWrapper.forEach(compileElement.propertyBindings, (expression, property) => {
      var setterFn;
      
      if (StringWrapper.startsWith(property, CLASS_PREFIX)) {
        setterFn = classSetterFactory(StringWrapper.substring(property, CLASS_PREFIX.length));
      } else if (DOM.hasProperty(compileElement.element, property)) {
        setterFn = reflector.setter(property);
      }

      if (isPresent(setterFn)) {
        protoView.bindElementProperty(expression.ast, property, setterFn);
      }
    });
  }

  _bindEvents(protoView, compileElement) {
    MapWrapper.forEach(compileElement.eventBindings, (expression, eventName) => {
      protoView.bindEvent(eventName,  expression);
    });
  }

  _bindDirectiveProperties(directives: List<DirectiveMetadata>,
                           compileElement: CompileElement) {
    var protoView = compileElement.inheritedProtoView;

    for (var directiveIndex = 0; directiveIndex < directives.length; directiveIndex++) {
      var directive = ListWrapper.get(directives, directiveIndex);
      var annotation = directive.annotation;
      if (isBlank(annotation.bind)) continue;
      StringMapWrapper.forEach(annotation.bind, function (dirProp, elProp) {
        var expression = isPresent(compileElement.propertyBindings) ?
          MapWrapper.get(compileElement.propertyBindings, elProp) :
            null;
        if (isBlank(expression)) {
          throw new BaseException("No element binding found for property '" + elProp
            + "' which is required by directive '" + stringify(directive.type) + "'");
        }
        var len = dirProp.length;
        var dirBindingName = dirProp;
        var isContentWatch = dirProp[len - 2] === '[' && dirProp[len - 1] === ']';
        if (isContentWatch) dirBindingName = dirProp.substring(0, len - 2);
        protoView.bindDirectiveProperty(
          directiveIndex,
          expression,
          dirBindingName,
          reflector.setter(dirBindingName),
          isContentWatch
        );
      });
    }
  }
}
