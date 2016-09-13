/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AnimationEntryMetadata} from '../animation/metadata';
import {ChangeDetectionStrategy} from '../change_detection/constants';
import {Injectable, Provider} from '../di';
import {isPresent} from '../facade/lang';
import {Type} from '../type';
import {TypeDecorator, makeDecorator, makePropDecorator} from '../util/decorators';

import {ViewEncapsulation} from './view';


/**
 * Type of the Directive decorator / constructor function.
 *
 * @stable
 */
export interface DirectiveDecorator {
  /**
   * Directives allow you to attach behavior to elements in the DOM.
   *
   * {@link Directive}s with an embedded view are called {@link Component}s.
   *
   * A directive consists of a single directive annotation and a controller class. When the
   * directive's `selector` matches
   * elements in the DOM, the following steps occur:
   *
   * 1. For each directive, the `ElementInjector` attempts to resolve the directive's constructor
   * arguments.
   * 2. Angular instantiates directives for each matched element using `ElementInjector` in a
   * depth-first order,
   *    as declared in the HTML.
   *
   * ## Understanding How Injection Works
   *
   * There are three stages of injection resolution.
   * - *Pre-existing Injectors*:
   *   - The terminal {@link Injector} cannot resolve dependencies. It either throws an error or, if
   * the dependency was
   *     specified as `@Optional`, returns `null`.
   *   - The platform injector resolves browser singleton resources, such as: cookies, title,
   * location, and others.
   * - *Component Injectors*: Each component instance has its own {@link Injector}, and they follow
   * the same parent-child hierarchy
   *     as the component instances in the DOM.
   * - *Element Injectors*: Each component instance has a Shadow DOM. Within the Shadow DOM each
   * element has an `ElementInjector`
   *     which follow the same parent-child hierarchy as the DOM elements themselves.
   *
   * When a template is instantiated, it also must instantiate the corresponding directives in a
   * depth-first order. The
   * current `ElementInjector` resolves the constructor dependencies for each directive.
   *
   * Angular then resolves dependencies as follows, according to the order in which they appear in
   * the
   * {@link Component}:
   *
   * 1. Dependencies on the current element
   * 2. Dependencies on element injectors and their parents until it encounters a Shadow DOM
   * boundary
   * 3. Dependencies on component injectors and their parents until it encounters the root component
   * 4. Dependencies on pre-existing injectors
   *
   *
   * The `ElementInjector` can inject other directives, element-specific special objects, or it can
   * delegate to the parent
   * injector.
   *
   * To inject other directives, declare the constructor parameter as:
   * - `directive:DirectiveType`: a directive on the current element only
   * - `@Host() directive:DirectiveType`: any directive that matches the type between the current
   * element and the
   *    Shadow DOM root.
   * - `@Query(DirectiveType) query:QueryList<DirectiveType>`: A live collection of direct child
   * directives.
   * - `@QueryDescendants(DirectiveType) query:QueryList<DirectiveType>`: A live collection of any
   * child directives.
   *
   * To inject element-specific special objects, declare the constructor parameter as:
   * - `element: ElementRef` to obtain a reference to logical element in the view.
   * - `viewContainer: ViewContainerRef` to control child template instantiation, for
   * {@link Directive} directives only
   * - `bindingPropagation: BindingPropagation` to control change detection in a more granular way.
   *
   * ### Example
   *
   * The following example demonstrates how dependency injection resolves constructor arguments in
   * practice.
   *
   *
   * Assume this HTML template:
   *
   * ```
   * <div dependency="1">
   *   <div dependency="2">
   *     <div dependency="3" my-directive>
   *       <div dependency="4">
   *         <div dependency="5"></div>
   *       </div>
   *       <div dependency="6"></div>
   *     </div>
   *   </div>
   * </div>
   * ```
   *
   * With the following `dependency` decorator and `SomeService` injectable class.
   *
   * ```
   * @Injectable()
   * class SomeService {
   * }
   *
   * @Directive({
   *   selector: '[dependency]',
   *   inputs: [
   *     'id: dependency'
   *   ]
   * })
   * class Dependency {
   *   id:string;
   * }
   * ```
   *
   * Let's step through the different ways in which `MyDirective` could be declared...
   *
   *
   * ### No injection
   *
   * Here the constructor is declared with no arguments, therefore nothing is injected into
   * `MyDirective`.
   *
   * ```
   * @Directive({ selector: '[my-directive]' })
   * class MyDirective {
   *   constructor() {
   *   }
   * }
   * ```
   *
   * This directive would be instantiated with no dependencies.
   *
   *
   * ### Component-level injection
   *
   * Directives can inject any injectable instance from the closest component injector or any of its
   * parents.
   *
   * Here, the constructor declares a parameter, `someService`, and injects the `SomeService` type
   * from the parent
   * component's injector.
   * ```
   * @Directive({ selector: '[my-directive]' })
   * class MyDirective {
   *   constructor(someService: SomeService) {
   *   }
   * }
   * ```
   *
   * This directive would be instantiated with a dependency on `SomeService`.
   *
   *
   * ### Injecting a directive from the current element
   *
   * Directives can inject other directives declared on the current element.
   *
   * ```
   * @Directive({ selector: '[my-directive]' })
   * class MyDirective {
   *   constructor(dependency: Dependency) {
   *     expect(dependency.id).toEqual(3);
   *   }
   * }
   * ```
   * This directive would be instantiated with `Dependency` declared at the same element, in this
   * case
   * `dependency="3"`.
   *
   * ### Injecting a directive from any ancestor elements
   *
   * Directives can inject other directives declared on any ancestor element (in the current Shadow
   * DOM), i.e. on the current element, the
   * parent element, or its parents.
   * ```
   * @Directive({ selector: '[my-directive]' })
   * class MyDirective {
   *   constructor(@Host() dependency: Dependency) {
   *     expect(dependency.id).toEqual(2);
   *   }
   * }
   * ```
   *
   * `@Host` checks the current element, the parent, as well as its parents recursively. If
   * `dependency="2"` didn't
   * exist on the direct parent, this injection would
   * have returned
   * `dependency="1"`.
   *
   *
   * ### Injecting a live collection of direct child directives
   *
   *
   * A directive can also query for other child directives. Since parent directives are instantiated
   * before child directives, a directive can't simply inject the list of child directives. Instead,
   * the directive injects a {@link QueryList}, which updates its contents as children are added,
   * removed, or moved by a directive that uses a {@link ViewContainerRef} such as a `ngFor`, an
   * `ngIf`, or an `ngSwitch`.
   *
   * ```
   * @Directive({ selector: '[my-directive]' })
   * class MyDirective {
   *   constructor(@Query(Dependency) dependencies:QueryList<Dependency>) {
   *   }
   * }
   * ```
   *
   * This directive would be instantiated with a {@link QueryList} which contains `Dependency` 4 and
   * `Dependency` 6. Here, `Dependency` 5 would not be included, because it is not a direct child.
   *
   * ### Injecting a live collection of descendant directives
   *
   * By passing the descendant flag to `@Query` above, we can include the children of the child
   * elements.
   *
   * ```
   * @Directive({ selector: '[my-directive]' })
   * class MyDirective {
   *   constructor(@Query(Dependency, {descendants: true}) dependencies:QueryList<Dependency>) {
   *   }
   * }
   * ```
   *
   * This directive would be instantiated with a Query which would contain `Dependency` 4, 5 and 6.
   *
   * ### Optional injection
   *
   * The normal behavior of directives is to return an error when a specified dependency cannot be
   * resolved. If you
   * would like to inject `null` on unresolved dependency instead, you can annotate that dependency
   * with `@Optional()`.
   * This explicitly permits the author of a template to treat some of the surrounding directives as
   * optional.
   *
   * ```
   * @Directive({ selector: '[my-directive]' })
   * class MyDirective {
   *   constructor(@Optional() dependency:Dependency) {
   *   }
   * }
   * ```
   *
   * This directive would be instantiated with a `Dependency` directive found on the current
   * element.
   * If none can be
   * found, the injector supplies `null` instead of throwing an error.
   *
   * ### Example
   *
   * Here we use a decorator directive to simply define basic tool-tip behavior.
   *
   * ```
   * @Directive({
   *   selector: '[tooltip]',
   *   inputs: [
   *     'text: tooltip'
   *   ],
   *   host: {
   *     '(mouseenter)': 'onMouseEnter()',
   *     '(mouseleave)': 'onMouseLeave()'
   *   }
   * })
   * class Tooltip{
   *   text:string;
   *   overlay:Overlay; // NOT YET IMPLEMENTED
   *   overlayManager:OverlayManager; // NOT YET IMPLEMENTED
   *
   *   constructor(overlayManager:OverlayManager) {
   *     this.overlay = overlay;
   *   }
   *
   *   onMouseEnter() {
   *     // exact signature to be determined
   *     this.overlay = this.overlayManager.open(text, ...);
   *   }
   *
   *   onMouseLeave() {
   *     this.overlay.close();
   *     this.overlay = null;
   *   }
   * }
   * ```
   * In our HTML template, we can then add this behavior to a `<div>` or any other element with the
   * `tooltip` selector,
   * like so:
   *
   * ```
   * <div tooltip="some text here"></div>
   * ```
   *
   * Directives can also control the instantiation, destruction, and positioning of inline template
   * elements:
   *
   * A directive uses a {@link ViewContainerRef} to instantiate, insert, move, and destroy views at
   * runtime.
   * The {@link ViewContainerRef} is created as a result of `<template>` element, and represents a
   * location in the current view
   * where these actions are performed.
   *
   * Views are always created as children of the current {@link Component}, and as siblings
   * of
   * the
   * `<template>` element. Thus a
   * directive in a child view cannot inject the directive that created it.
   *
   * Since directives that create views via ViewContainers are common in Angular, and using the full
   * `<template>` element syntax is wordy, Angular
   * also supports a shorthand notation: `<li *foo="bar">` and `<li template="foo: bar">` are
   * equivalent.
   *
   * Thus,
   *
   * ```
   * <ul>
   *   <li *foo="bar" title="text"></li>
   * </ul>
   * ```
   *
   * Expands in use to:
   *
   * ```
   * <ul>
   *   <template [foo]="bar">
   *     <li title="text"></li>
   *   </template>
   * </ul>
   * ```
   *
   * Notice that although the shorthand places `*foo="bar"` within the `<li>` element, the binding
   * for
   * the directive
   * controller is correctly instantiated on the `<template>` element rather than the `<li>`
   * element.
   *
   * ## Lifecycle hooks
   *
   * When the directive class implements some {@linkDocs guide/lifecycle-hooks} the
   * callbacks are called by the change detection at defined points in time during the life of the
   * directive.
   *
   * ### Example
   *
   * Let's suppose we want to implement the `unless` behavior, to conditionally include a template.
   *
   * Here is a simple directive that triggers on an `unless` selector:
   *
   * ```
   * @Directive({
   *   selector: '[unless]',
   *   inputs: ['unless']
   * })
   * export class Unless {
   *   viewContainer: ViewContainerRef;
   *   templateRef: TemplateRef;
   *   prevCondition: boolean;
   *
   *   constructor(viewContainer: ViewContainerRef, templateRef: TemplateRef) {
   *     this.viewContainer = viewContainer;
   *     this.templateRef = templateRef;
   *     this.prevCondition = null;
   *   }
   *
   *   set unless(newCondition) {
   *     if (newCondition && (isBlank(this.prevCondition) || !this.prevCondition)) {
   *       this.prevCondition = true;
   *       this.viewContainer.clear();
   *     } else if (!newCondition && (isBlank(this.prevCondition) || this.prevCondition)) {
   *       this.prevCondition = false;
   *       this.viewContainer.create(this.templateRef);
   *     }
   *   }
   * }
   * ```
   *
   * We can then use this `unless` selector in a template:
   * ```
   * <ul>
   *   <li *unless="expr"></li>
   * </ul>
   * ```
   *
   * Once the directive instantiates the child view, the shorthand notation for the template expands
   * and the result is:
   *
   * ```
   * <ul>
   *   <template [unless]="exp">
   *     <li></li>
   *   </template>
   *   <li></li>
   * </ul>
   * ```
   *
   * Note also that although the `<li></li>` template still exists inside the
   * `<template></template>`,
   * the instantiated
   * view occurs on the second `<li></li>` which is a sibling to the `<template>` element.
   *
   * ### Example as TypeScript Decorator
   *
   * {@example core/ts/metadata/metadata.ts region='directive'}
   *
   * ### Example as ES5 DSL
   *
   * ```
   * var MyDirective = ng
   *   .Directive({...})
   *   .Class({
   *     constructor: function() {
   *       ...
   *     }
   *   })
   * ```
   *
   * ### Example as ES5 annotation
   *
   * ```
   * var MyDirective = function() {
   *   ...
   * };
   *
   * MyDirective.annotations = [
   *   new ng.Directive({...})
   * ]
   * ```
   */
  (obj: Directive): TypeDecorator;

  /**
   * See the {@link Directive} decorator.
   */
  new (obj: Directive): Directive;
}

export interface Directive {
  /**
   * The CSS selector that triggers the instantiation of a directive.
   *
   * Angular only allows directives to trigger on CSS selectors that do not cross element
   * boundaries.
   *
   * `selector` may be declared as one of the following:
   *
   * - `element-name`: select by element name.
   * - `.class`: select by class name.
   * - `[attribute]`: select by attribute name.
   * - `[attribute=value]`: select by attribute name and value.
   * - `:not(sub_selector)`: select only if the element does not match the `sub_selector`.
   * - `selector1, selector2`: select if either `selector1` or `selector2` matches.
   *
   *
   * ### Example
   *
   * Suppose we have a directive with an `input[type=text]` selector.
   *
   * And the following HTML:
   *
   * ```html
   * <form>
   *   <input type="text">
   *   <input type="radio">
   * <form>
   * ```
   *
   * The directive would only be instantiated on the `<input type="text">` element.
   *
   */
  selector?: string;

  /**
   * Enumerates the set of data-bound input properties for a directive
   *
   * Angular automatically updates input properties during change detection.
   *
   * The `inputs` property defines a set of `directiveProperty` to `bindingProperty`
   * configuration:
   *
   * - `directiveProperty` specifies the component property where the value is written.
   * - `bindingProperty` specifies the DOM property where the value is read from.
   *
   * When `bindingProperty` is not provided, it is assumed to be equal to `directiveProperty`.
   *
   * ### Example ([live demo](http://plnkr.co/edit/ivhfXY?p=preview))
   *
   * The following example creates a component with two data-bound properties.
   *
   * ```typescript
   * @Component({
   *   selector: 'bank-account',
   *   inputs: ['bankName', 'id: account-id'],
   *   template: `
   *     Bank Name: {{bankName}}
   *     Account Id: {{id}}
   *   `
   * })
   * class BankAccount {
   *   bankName: string;
   *   id: string;
   *
   *   // this property is not bound, and won't be automatically updated by Angular
   *   normalizedBankName: string;
   * }
   *
   * @Component({
   *   selector: 'app',
   *   template: `
   *     <bank-account bank-name="RBC" account-id="4747"></bank-account>
   *   `
   * })
   * class App {}
   * ```
   *
   */
  inputs?: string[];

  /**
   * Enumerates the set of event-bound output properties.
   *
   * When an output property emits an event, an event handler attached to that event
   * the template is invoked.
   *
   * The `outputs` property defines a set of `directiveProperty` to `bindingProperty`
   * configuration:
   *
   * - `directiveProperty` specifies the component property that emits events.
   * - `bindingProperty` specifies the DOM property the event handler is attached to.
   *
   * ### Example ([live demo](http://plnkr.co/edit/d5CNq7?p=preview))
   *
   * ```typescript
   * @Directive({
   *   selector: 'interval-dir',
   *   outputs: ['everySecond', 'five5Secs: everyFiveSeconds']
   * })
   * class IntervalDir {
   *   everySecond = new EventEmitter();
   *   five5Secs = new EventEmitter();
   *
   *   constructor() {
   *     setInterval(() => this.everySecond.emit("event"), 1000);
   *     setInterval(() => this.five5Secs.emit("event"), 5000);
   *   }
   * }
   *
   * @Component({
   *   selector: 'app',
   *   template: `
   *     <interval-dir (everySecond)="everySecond()" (everyFiveSeconds)="everyFiveSeconds()">
   *     </interval-dir>
   *   `
   * })
   * class App {
   *   everySecond() { console.log('second'); }
   *   everyFiveSeconds() { console.log('five seconds'); }
   * }
   * ```
   *
   */
  outputs?: string[];

  /**
   * Specify the events, actions, properties and attributes related to the host element.
   *
   * ## Host Listeners
   *
   * Specifies which DOM events a directive listens to via a set of `(event)` to `method`
   * key-value pairs:
   *
   * - `event`: the DOM event that the directive listens to.
   * - `statement`: the statement to execute when the event occurs.
   * If the evaluation of the statement returns `false`, then `preventDefault`is applied on the DOM
   * event.
   *
   * To listen to global events, a target must be added to the event name.
   * The target can be `window`, `document` or `body`.
   *
   * When writing a directive event binding, you can also refer to the $event local variable.
   *
   * ### Example ([live demo](http://plnkr.co/edit/DlA5KU?p=preview))
   *
   * The following example declares a directive that attaches a click listener to the button and
   * counts clicks.
   *
   * ```typescript
   * @Directive({
   *   selector: 'button[counting]',
   *   host: {
   *     '(click)': 'onClick($event.target)'
   *   }
   * })
   * class CountClicks {
   *   numberOfClicks = 0;
   *
   *   onClick(btn) {
   *     console.log("button", btn, "number of clicks:", this.numberOfClicks++);
   *   }
   * }
   *
   * @Component({
   *   selector: 'app',
   *   template: `<button counting>Increment</button>`
   * })
   * class App {}
   * ```
   *
   * ## Host Property Bindings
   *
   * Specifies which DOM properties a directive updates.
   *
   * Angular automatically checks host property bindings during change detection.
   * If a binding changes, it will update the host element of the directive.
   *
   * ### Example ([live demo](http://plnkr.co/edit/gNg0ED?p=preview))
   *
   * The following example creates a directive that sets the `valid` and `invalid` classes
   * on the DOM element that has ngModel directive on it.
   *
   * ```typescript
   * @Directive({
   *   selector: '[ngModel]',
   *   host: {
   *     '[class.valid]': 'valid',
   *     '[class.invalid]': 'invalid'
   *   }
   * })
   * class NgModelStatus {
   *   constructor(public control:NgModel) {}
   *   get valid { return this.control.valid; }
   *   get invalid { return this.control.invalid; }
   * }
   *
   * @Component({
   *   selector: 'app',
   *   template: `<input [(ngModel)]="prop">`
   * })
   * class App {
   *   prop;
   * }
   * ```
   *
   * ## Attributes
   *
   * Specifies static attributes that should be propagated to a host element.
   *
   * ### Example
   *
   * In this example using `my-button` directive (ex.: `<div my-button></div>`) on a host element
   * (here: `<div>` ) will ensure that this element will get the "button" role.
   *
   * ```typescript
   * @Directive({
   *   selector: '[my-button]',
   *   host: {
   *     'role': 'button'
   *   }
   * })
   * class MyButton {
   * }
   * ```
   */
  host?: {[key: string]: string};

  /**
   * Defines the set of injectable objects that are visible to a Directive and its light DOM
   * children.
   *
   * ## Simple Example
   *
   * Here is an example of a class that can be injected:
   *
   * ```
   * class Greeter {
   *    greet(name:string) {
   *      return 'Hello ' + name + '!';
   *    }
   * }
   *
   * @Directive({
   *   selector: 'greet',
   *   providers: [
   *     Greeter
   *   ]
   * })
   * class HelloWorld {
   *   greeter:Greeter;
   *
   *   constructor(greeter:Greeter) {
   *     this.greeter = greeter;
   *   }
   * }
   * ```
   */
  providers?: Provider[];

  /**
   * Defines the name that can be used in the template to assign this directive to a variable.
   *
   * ## Simple Example
   *
   * ```
   * @Directive({
   *   selector: 'child-dir',
   *   exportAs: 'child'
   * })
   * class ChildDir {
   * }
   *
   * @Component({
   *   selector: 'main',
   *   template: `<child-dir #c="child"></child-dir>`
   * })
   * class MainComponent {
   * }
   *
   * ```
   */
  exportAs?: string;

  /**
   * Configures the queries that will be injected into the directive.
   *
   * Content queries are set before the `ngAfterContentInit` callback is called.
   * View queries are set before the `ngAfterViewInit` callback is called.
   *
   * ### Example
   *
   * ```
   * @Component({
   *   selector: 'someDir',
   *   queries: {
   *     contentChildren: new ContentChildren(ChildDirective),
   *     viewChildren: new ViewChildren(ChildDirective)
   *   },
   *   template: '<child-directive></child-directive>'
   * })
   * class SomeDir {
   *   contentChildren: QueryList<ChildDirective>,
   *   viewChildren: QueryList<ChildDirective>
   *
   *   ngAfterContentInit() {
   *     // contentChildren is set
   *   }
   *
   *   ngAfterViewInit() {
   *     // viewChildren is set
   *   }
   * }
   * ```
   */
  queries?: {[key: string]: any};
}

/**
 * Directive decorator and metadata.
 *
 * @stable
 * @Annotation
 */
export const Directive: DirectiveDecorator = <DirectiveDecorator>makeDecorator({
  selector: undefined,
  inputs: undefined,
  outputs: undefined,
  host: undefined,
  providers: undefined,
  exportAs: undefined,
  queries: undefined
});

/**
 * Type of the Component decorator / constructor function.
 *
 * @stable
 */
export interface ComponentDecorator {
  /**
   * Declare reusable UI building blocks for an application.
   *
   * Each Angular component requires a single `@Component` annotation. The
   * `@Component`
   * annotation specifies when a component is instantiated, and which properties and hostListeners
   * it
   * binds to.
   *
   * When a component is instantiated, Angular
   * - creates a shadow DOM for the component.
   * - loads the selected template into the shadow DOM.
   * - creates all the injectable objects configured with `providers` and `viewProviders`.
   *
   * All template expressions and statements are then evaluated against the component instance.
   *
   * ## Lifecycle hooks
   *
   * When the component class implements some {@linkDocs guide/lifecycle-hooks} the
   * callbacks are called by the change detection at defined points in time during the life of the
   * component.
   *
   * ### Example
   *
   * {@example core/ts/metadata/metadata.ts region='component'}
   *
   * ### Example as TypeScript Decorator
   *
   * {@example core/ts/metadata/metadata.ts region='component'}
   *
   * ### Example as ES5 DSL
   *
   * ```
   * var MyComponent = ng
   *   .Component({...})
   *   .Class({
   *     constructor: function() {
   *       ...
   *     }
   *   })
   * ```
   *
   * ### Example as ES5 annotation
   *
   * ```
   * var MyComponent = function() {
   *   ...
   * };
   *
   * MyComponent.annotations = [
   *   new ng.Component({...})
   * ]
   * ```
   */
  (obj: Component): TypeDecorator;
  /**
   * See the {@link Component} decorator.
   */
  new (obj: Component): Component;
}

/**
 * Type of the Component metadata.
 *
 * @stable
 */
export interface Component extends Directive {
  /**
   * Defines the used change detection strategy.
   *
   * When a component is instantiated, Angular creates a change detector, which is responsible for
   * propagating the component's bindings.
   *
   * The `changeDetection` property defines, whether the change detection will be checked every time
   * or only when the component tells it to do so.
   */
  changeDetection?: ChangeDetectionStrategy;

  /**
   * Defines the set of injectable objects that are visible to its view DOM children.
   *
   * ## Simple Example
   *
   * Here is an example of a class that can be injected:
   *
   * ```
   * class Greeter {
   *    greet(name:string) {
   *      return 'Hello ' + name + '!';
   *    }
   * }
   *
   * @Directive({
   *   selector: 'needs-greeter'
   * })
   * class NeedsGreeter {
   *   greeter:Greeter;
   *
   *   constructor(greeter:Greeter) {
   *     this.greeter = greeter;
   *   }
   * }
   *
   * @Component({
   *   selector: 'greet',
   *   viewProviders: [
   *     Greeter
   *   ],
   *   template: `<needs-greeter></needs-greeter>`
   * })
   * class HelloWorld {
   * }
   *
   * ```
   */
  viewProviders?: Provider[];

  /**
   * The module id of the module that contains the component.
   * Needed to be able to resolve relative urls for templates and styles.
   * In CommonJS, this can always be set to `module.id`, similarly SystemJS exposes `__moduleName`
   * variable within each module.
   *
   *
   * ## Simple Example
   *
   * ```
   * @Directive({
   *   selector: 'someDir',
   *   moduleId: module.id
   * })
   * class SomeDir {
   * }
   *
   * ```
   */
  moduleId?: string;

  /**
   * Specifies a template URL for an Angular component.
   *
   * NOTE: Only one of `templateUrl` or `template` can be defined per View.
   *
   * <!-- TODO: what's the url relative to? -->
   */
  templateUrl?: string;

  /**
   * Specifies an inline template for an Angular component.
   *
   * NOTE: Only one of `templateUrl` or `template` can be defined per View.
   */
  template?: string;

  /**
   * Specifies stylesheet URLs for an Angular component.
   *
   * <!-- TODO: what's the url relative to? -->
   */
  styleUrls?: string[];

  /**
   * Specifies inline stylesheets for an Angular component.
   */
  styles?: string[];

  /**
   * Animations are defined on components via an animation-like DSL. This DSL approach to describing
   * animations allows for a flexibility that both benefits developers and the framework.
   *
   * Animations work by listening on state changes that occur on an element within
   * the template. When a state change occurs, Angular can then take advantage and animate the
   * arc in between. This works similar to how CSS transitions work, however, by having a
   * programmatic DSL, animations are not limited to environments that are DOM-specific.
   * (Angular can also perform optimizations behind the scenes to make animations more performant.)
   *
   * For animations to be available for use, animation state changes are placed within
   * {@link trigger animation triggers} which are housed inside of the `animations` annotation
   * metadata. Within a trigger both {@link state state} and {@link transition transition} entries
   * can be placed.
   *
   * ```typescript
   * @Component({
   *   selector: 'animation-cmp',
   *   templateUrl: 'animation-cmp.html',
   *   animations: [
   *     // this here is our animation trigger that
   *     // will contain our state change animations.
   *     trigger('myTriggerName', [
   *       // the styles defined for the `on` and `off`
   *       // states declared below are persisted on the
   *       // element once the animation completes.
   *       state('on', style({ opacity: 1 }),
   *       state('off', style({ opacity: 0 }),
   *
   *       // this here is our animation that kicks off when
   *       // this state change jump is true
   *       transition('on => off', [
   *         animate("1s")
   *       ])
   *     ])
   *   ]
   * })
   * ```
   *
   * As depicted in the code above, a group of related animation states are all contained within
   * an animation `trigger` (the code example above called the trigger `myTriggerName`).
   * When a trigger is created then it can be bound onto an element within the component's
   * template via a property prefixed by an `@` symbol followed by trigger name and an expression
   * that
   * is used to determine the state value for that trigger.
   *
   * ```html
   * <!-- animation-cmp.html -->
   * <div @myTriggerName="expression">...</div>
   * ```
   *
   * For state changes to be executed, the `expression` value must change value from its existing
   * value
   * to something that we have set an animation to animate on (in the example above we are listening
   * to a change of state between `on` and `off`). The `expression` value attached to the trigger
   * must be something that can be evaluated with the template/component context.
   *
   * ### DSL Animation Functions
   *
   * Please visit each of the animation DSL functions listed below to gain a better understanding
   * of how and why they are used for crafting animations in Angular2:
   *
   * - {@link trigger trigger()}
   * - {@link state state()}
   * - {@link transition transition()}
   * - {@link group group()}
   * - {@link sequence sequence()}
   * - {@link style style()}
   * - {@link animate animate()}
   * - {@link keyframes keyframes()}
   */
  animations?: AnimationEntryMetadata[];

  /**
   * Specify how the template and the styles should be encapsulated.
   * The default is {@link ViewEncapsulation#Emulated `ViewEncapsulation.Emulated`} if the view
   * has styles,
   * otherwise {@link ViewEncapsulation#None `ViewEncapsulation.None`}.
   */
  encapsulation?: ViewEncapsulation;

  interpolation?: [string, string];

  /**
   * Defines the components that should be compiled as well when
   * this component is defined. For each components listed here,
   * Angular will create a {@link ComponentFactory ComponentFactory} and store it in the
   * {@link ComponentFactoryResolver ComponentFactoryResolver}.
   */
  entryComponents?: Array<Type<any>|any[]>;
}

/**
 * Component decorator and metadata.
 *
 * @stable
 * @Annotation
 */
export const Component: ComponentDecorator = <ComponentDecorator>makeDecorator(
    {
      selector: undefined,
      inputs: undefined,
      outputs: undefined,
      host: undefined,
      exportAs: undefined,
      moduleId: undefined,
      providers: undefined,
      viewProviders: undefined,
      changeDetection: ChangeDetectionStrategy.Default,
      queries: undefined,
      templateUrl: undefined,
      template: undefined,
      styleUrls: undefined,
      styles: undefined,
      animations: undefined,
      encapsulation: undefined,
      interpolation: undefined,
      entryComponents: undefined
    },
    Directive);

/**
 * Type of the Pipe decorator / constructor function.
 *
 * @stable
 */
export interface PipeDecorator {
  /**
   * Declare reusable pipe function.
   *
   * A "pure" pipe is only re-evaluated when either the input or any of the arguments change.
   *
   * When not specified, pipes default to being pure.
   */
  (obj: Pipe): TypeDecorator;

  /**
   * See the {@link Pipe} decorator.
   */
  new (obj: Pipe): Pipe;
}

/**
 * Type of the Pipe metadata.
 *
 * @stable
 */
export interface Pipe {
  name?: string;
  pure?: boolean;
}

/**
 * Pipe decorator and metadata.
 *
 * @stable
 * @Annotation
 */
export const Pipe: PipeDecorator = <PipeDecorator>makeDecorator({
  name: undefined,
  pure: true,
});


/**
 * Type of the Input decorator / constructor function.
 *
 * @stable
 */
export interface InputDecorator {
  /**
   * Declares a data-bound input property.
   *
   * Angular automatically updates data-bound properties during change detection.
   *
   * `Input` takes an optional parameter that specifies the name
   * used when instantiating a component in the template. When not provided,
   * the name of the decorated property is used.
   *
   * ### Example
   *
   * The following example creates a component with two input properties.
   *
   * ```typescript
   * @Component({
   *   selector: 'bank-account',
   *   template: `
   *     Bank Name: {{bankName}}
   *     Account Id: {{id}}
   *   `
   * })
   * class BankAccount {
   *   @Input() bankName: string;
   *   @Input('account-id') id: string;
   *
   *   // this property is not bound, and won't be automatically updated by Angular
   *   normalizedBankName: string;
   * }
   *
   * @Component({
   *   selector: 'app',
   *   template: `
   *     <bank-account bank-name="RBC" account-id="4747"></bank-account>
   *   `
   * })
   *
   * class App {}
   * ```
   * @stable
   */
  (bindingPropertyName?: string): any;
  new (bindingPropertyName?: string): any;
}

/**
 * Type of the Input metadata.
 *
 * @stable
 */
export interface Input {
  /**
   * Name used when instantiating a component in the template.
   */
  bindingPropertyName?: string;
}

/**
 * Input decorator and metadata.
 *
 * @stable
 * @Annotation
 */
export const Input: InputDecorator = makePropDecorator([['bindingPropertyName', undefined]]);

/**
 * Type of the Output decorator / constructor function.
 *
 * @stable
 */
export interface OutputDecorator {
  /**
   * Declares an event-bound output property.
   *
   * When an output property emits an event, an event handler attached to that event
   * the template is invoked.
   *
   * `Output` takes an optional parameter that specifies the name
   * used when instantiating a component in the template. When not provided,
   * the name of the decorated property is used.
   *
   * ### Example
   *
   * ```typescript
   * @Directive({
   *   selector: 'interval-dir',
   * })
   * class IntervalDir {
   *   @Output() everySecond = new EventEmitter();
   *   @Output('everyFiveSeconds') five5Secs = new EventEmitter();
   *
   *   constructor() {
   *     setInterval(() => this.everySecond.emit("event"), 1000);
   *     setInterval(() => this.five5Secs.emit("event"), 5000);
   *   }
   * }
   *
   * @Component({
   *   selector: 'app',
   *   template: `
   *     <interval-dir (everySecond)="everySecond()" (everyFiveSeconds)="everyFiveSeconds()">
   *     </interval-dir>
   *   `
   * })
   * class App {
   *   everySecond() { console.log('second'); }
   *   everyFiveSeconds() { console.log('five seconds'); }
   * }
   * ```
   * @stable
   */
  (bindingPropertyName?: string): any;
  new (bindingPropertyName?: string): any;
}

/**
 * Type of the Output metadata.
 *
 * @stable
 */
export interface Output { bindingPropertyName?: string; }

/**
 * Output decorator and metadata.
 *
 * @stable
 * @Annotation
 */
export const Output: OutputDecorator = makePropDecorator([['bindingPropertyName', undefined]]);


/**
 * Type of the HostBinding decorator / constructor function.
 *
 * @stable
 */
export interface HostBindingDecorator {
  /**
   * Declares a host property binding.
   *
   * Angular automatically checks host property bindings during change detection.
   * If a binding changes, it will update the host element of the directive.
   *
   * `HostBinding` takes an optional parameter that specifies the property
   * name of the host element that will be updated. When not provided,
   * the class property name is used.
   *
   * ### Example
   *
   * The following example creates a directive that sets the `valid` and `invalid` classes
   * on the DOM element that has ngModel directive on it.
   *
   * ```typescript
   * @Directive({selector: '[ngModel]'})
   * class NgModelStatus {
   *   constructor(public control:NgModel) {}
   *   @HostBinding('class.valid') get valid() { return this.control.valid; }
   *   @HostBinding('class.invalid') get invalid() { return this.control.invalid; }
   * }
   *
   * @Component({
   *   selector: 'app',
   *   template: `<input [(ngModel)]="prop">`,
   *   directives: [FORM_DIRECTIVES, NgModelStatus]
   * })
   * class App {
   *   prop;
   * }
   * ```
   * @stable
   */
  (hostPropertyName?: string): any;
  new (hostPropertyName?: string): any;
}

/**
 * Type of the HostBinding metadata.
 *
 * @stable
 */
export interface HostBinding { hostPropertyName?: string; }

/**
 * HostBinding decorator and metadata.
 *
 * @stable
 * @Annotation
 */
export const HostBinding: HostBindingDecorator =
    makePropDecorator([['hostPropertyName', undefined]]);


/**
 * Type of the HostListener decorator / constructor function.
 *
 * @stable
 */
export interface HostListenerDecorator {
  /**
   * Declares a host listener.
   *
   * Angular will invoke the decorated method when the host element emits the specified event.
   *
   * If the decorated method returns `false`, then `preventDefault` is applied on the DOM
   * event.
   *
   * ### Example
   *
   * The following example declares a directive that attaches a click listener to the button and
   * counts clicks.
   *
   * ```typescript
   * @Directive({selector: 'button[counting]'})
   * class CountClicks {
   *   numberOfClicks = 0;
   *
   *   @HostListener('click', ['$event.target'])
   *   onClick(btn) {
   *     console.log("button", btn, "number of clicks:", this.numberOfClicks++);
   *   }
   * }
   *
   * @Component({
   *   selector: 'app',
   *   template: `<button counting>Increment</button>`,
   *   directives: [CountClicks]
   * })
   * class App {}
   * ```
   * @stable
   * @Annotation
   */
  (eventName: string, args?: string[]): any;
  new (eventName: string, args?: string[]): any;
}

/**
 * Type of the HostListener metadata.
 *
 * @stable
 */
export interface HostListener {
  eventName?: string;
  args?: string[];
}

/**
 * HostBinding decorator and metadata.
 *
 * @stable
 * @Annotation
 */
export const HostListener: HostListenerDecorator =
    makePropDecorator([['eventName', undefined], ['args', []]]);
