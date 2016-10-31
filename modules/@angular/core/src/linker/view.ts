/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ChangeDetectorRef, ChangeDetectorStatus} from '../change_detection/change_detection';
import {Injector} from '../di/injector';
import {ListWrapper} from '../facade/collection';
import {isPresent} from '../facade/lang';
import {WtfScopeFn, wtfCreateScope, wtfLeave} from '../profile/profile';
import {RenderComponentType, RenderDebugInfo, Renderer} from '../render/api';

import {AnimationViewContext} from './animation_view_context';
import {DebugContext, StaticNodeDebugInfo} from './debug_context';
import {AppElement} from './element';
import {ElementInjector} from './element_injector';
import {ExpressionChangedAfterItHasBeenCheckedError, ViewDestroyedError, ViewWrappedError} from './errors';
import {ViewRef_} from './view_ref';
import {ViewType} from './view_type';
import {ViewUtils, ensureSlotCount, flattenNestedViewRenderNodes} from './view_utils';

var _scope_check: WtfScopeFn = wtfCreateScope(`AppView#check(ascii id)`);

/**
 * Cost of making objects: http://jsperf.com/instantiate-size-of-object
 *
 */
export abstract class AppView<T> {
  ref: ViewRef_<T>;
  rootNodesOrAppElements: any[];
  allNodes: any[];
  disposables: Function[];
  contentChildren: AppView<any>[] = [];
  viewChildren: AppView<any>[] = [];
  viewContainerElement: AppElement = null;

  numberOfChecks: number = 0;

  projectableNodes: Array<any|any[]>;

  renderer: Renderer;

  private _hasExternalHostElement: boolean;
  private _animationContext: AnimationViewContext;

  public context: T;

  constructor(
      public clazz: any, public componentType: RenderComponentType, public type: ViewType,
      public viewUtils: ViewUtils, public parentInjector: Injector,
      public declarationAppElement: AppElement, public cdMode: ChangeDetectorStatus) {
    this.ref = new ViewRef_(this);
    if (type === ViewType.COMPONENT || type === ViewType.HOST) {
      this.renderer = viewUtils.renderComponent(componentType);
    } else {
      this.renderer = declarationAppElement.parentView.renderer;
    }
  }

  get animationContext(): AnimationViewContext {
    if (!this._animationContext) {
      this._animationContext = new AnimationViewContext();
    }
    return this._animationContext;
  }

  get destroyed(): boolean { return this.cdMode === ChangeDetectorStatus.Destroyed; }

  create(context: T, givenProjectableNodes: Array<any|any[]>, rootSelectorOrNode: string|any):
      AppElement {
    this.context = context;
    var projectableNodes: any[];
    switch (this.type) {
      case ViewType.COMPONENT:
        projectableNodes = ensureSlotCount(givenProjectableNodes, this.componentType.slotCount);
        break;
      case ViewType.EMBEDDED:
        projectableNodes = this.declarationAppElement.parentView.projectableNodes;
        break;
      case ViewType.HOST:
        // Note: Don't ensure the slot count for the projectableNodes as we store
        // them only for the contained component view (which will later check the slot count...)
        projectableNodes = givenProjectableNodes;
        break;
    }
    this._hasExternalHostElement = isPresent(rootSelectorOrNode);
    this.projectableNodes = projectableNodes;
    return this.createInternal(rootSelectorOrNode);
  }

  /**
   * Overwritten by implementations.
   * Returns the AppElement for the host element for ViewType.HOST.
   */
  createInternal(rootSelectorOrNode: string|any): AppElement { return null; }

  init(rootNodesOrAppElements: any[], allNodes: any[], disposables: Function[]) {
    this.rootNodesOrAppElements = rootNodesOrAppElements;
    this.allNodes = allNodes;
    this.disposables = disposables;
    if (this.type === ViewType.COMPONENT) {
      // Note: the render nodes have been attached to their host element
      // in the ViewFactory already.
      this.declarationAppElement.parentView.viewChildren.push(this);
      this.dirtyParentQueriesInternal();
    }
  }

  injectorGet(token: any, nodeIndex: number, notFoundResult: any): any {
    return this.injectorGetInternal(token, nodeIndex, notFoundResult);
  }

  /**
   * Overwritten by implementations
   */
  injectorGetInternal(token: any, nodeIndex: number, notFoundResult: any): any {
    return notFoundResult;
  }

  injector(nodeIndex: number): Injector {
    if (isPresent(nodeIndex)) {
      return new ElementInjector(this, nodeIndex);
    } else {
      return this.parentInjector;
    }
  }

  destroy() {
    if (this._hasExternalHostElement) {
      this.renderer.detachView(this.flatRootNodes);
    } else if (isPresent(this.viewContainerElement)) {
      this.viewContainerElement.detachView(this.viewContainerElement.nestedViews.indexOf(this));
    }
    this._destroyRecurse();
  }

  private _destroyRecurse() {
    if (this.cdMode === ChangeDetectorStatus.Destroyed) {
      return;
    }
    var children = this.contentChildren;
    for (var i = 0; i < children.length; i++) {
      children[i]._destroyRecurse();
    }
    children = this.viewChildren;
    for (var i = 0; i < children.length; i++) {
      children[i]._destroyRecurse();
    }
    this.destroyLocal();

    this.cdMode = ChangeDetectorStatus.Destroyed;
  }

  destroyLocal() {
    var hostElement =
        this.type === ViewType.COMPONENT ? this.declarationAppElement.nativeElement : null;
    for (var i = 0; i < this.disposables.length; i++) {
      this.disposables[i]();
    }
    this.destroyInternal();
    this.dirtyParentQueriesInternal();

    if (this._animationContext) {
      this._animationContext.onAllActiveAnimationsDone(
          () => this.renderer.destroyView(hostElement, this.allNodes));
    } else {
      this.renderer.destroyView(hostElement, this.allNodes);
    }
  }

  /**
   * Overwritten by implementations
   */
  destroyInternal(): void {}

  /**
   * Overwritten by implementations
   */
  detachInternal(): void {}

  detach(): void {
    this.detachInternal();
    if (this._animationContext) {
      this._animationContext.onAllActiveAnimationsDone(
          () => this.renderer.detachView(this.flatRootNodes));
    } else {
      this.renderer.detachView(this.flatRootNodes);
    }
  }

  get changeDetectorRef(): ChangeDetectorRef { return this.ref; }

  get parent(): AppView<any> {
    return isPresent(this.declarationAppElement) ? this.declarationAppElement.parentView : null;
  }

  get flatRootNodes(): any[] { return flattenNestedViewRenderNodes(this.rootNodesOrAppElements); }

  get lastRootNode(): any {
    var lastNode = this.rootNodesOrAppElements.length > 0 ?
        this.rootNodesOrAppElements[this.rootNodesOrAppElements.length - 1] :
        null;
    return _findLastRenderNode(lastNode);
  }

  /**
   * Overwritten by implementations
   */
  dirtyParentQueriesInternal(): void {}

  detectChanges(throwOnChange: boolean): void {
    var s = _scope_check(this.clazz);
    if (this.cdMode === ChangeDetectorStatus.Checked ||
        this.cdMode === ChangeDetectorStatus.Errored)
      return;
    if (this.cdMode === ChangeDetectorStatus.Destroyed) {
      this.throwDestroyedError('detectChanges');
    }
    this.detectChangesInternal(throwOnChange);
    if (this.cdMode === ChangeDetectorStatus.CheckOnce) this.cdMode = ChangeDetectorStatus.Checked;

    this.numberOfChecks++;
    wtfLeave(s);
  }

  /**
   * Overwritten by implementations
   */
  detectChangesInternal(throwOnChange: boolean): void {
    this.detectContentChildrenChanges(throwOnChange);
    this.detectViewChildrenChanges(throwOnChange);
  }

  detectContentChildrenChanges(throwOnChange: boolean) {
    for (var i = 0; i < this.contentChildren.length; ++i) {
      var child = this.contentChildren[i];
      if (child.cdMode === ChangeDetectorStatus.Detached) continue;
      child.detectChanges(throwOnChange);
    }
  }

  detectViewChildrenChanges(throwOnChange: boolean) {
    for (var i = 0; i < this.viewChildren.length; ++i) {
      var child = this.viewChildren[i];
      if (child.cdMode === ChangeDetectorStatus.Detached) continue;
      child.detectChanges(throwOnChange);
    }
  }

  markContentChildAsMoved(renderAppElement: AppElement): void { this.dirtyParentQueriesInternal(); }

  addToContentChildren(renderAppElement: AppElement): void {
    renderAppElement.parentView.contentChildren.push(this);
    this.viewContainerElement = renderAppElement;
    this.dirtyParentQueriesInternal();
  }

  removeFromContentChildren(renderAppElement: AppElement): void {
    ListWrapper.remove(renderAppElement.parentView.contentChildren, this);
    this.dirtyParentQueriesInternal();
    this.viewContainerElement = null;
  }

  markAsCheckOnce(): void { this.cdMode = ChangeDetectorStatus.CheckOnce; }

  markPathToRootAsCheckOnce(): void {
    let c: AppView<any> = this;
    while (isPresent(c) && c.cdMode !== ChangeDetectorStatus.Detached) {
      if (c.cdMode === ChangeDetectorStatus.Checked) {
        c.cdMode = ChangeDetectorStatus.CheckOnce;
      }
      let parentEl =
          c.type === ViewType.COMPONENT ? c.declarationAppElement : c.viewContainerElement;
      c = isPresent(parentEl) ? parentEl.parentView : null;
    }
  }

  eventHandler<E, R>(cb: (eventName: string, event?: E) => R): (eventName: string, event?: E) => R {
    return cb;
  }

  throwDestroyedError(details: string): void { throw new ViewDestroyedError(details); }
}

export class DebugAppView<T> extends AppView<T> {
  private _currentDebugContext: DebugContext = null;

  constructor(
      clazz: any, componentType: RenderComponentType, type: ViewType, viewUtils: ViewUtils,
      parentInjector: Injector, declarationAppElement: AppElement, cdMode: ChangeDetectorStatus,
      public staticNodeDebugInfos: StaticNodeDebugInfo[]) {
    super(clazz, componentType, type, viewUtils, parentInjector, declarationAppElement, cdMode);
  }

  create(context: T, givenProjectableNodes: Array<any|any[]>, rootSelectorOrNode: string|any):
      AppElement {
    this._resetDebug();
    try {
      return super.create(context, givenProjectableNodes, rootSelectorOrNode);
    } catch (e) {
      this._rethrowWithContext(e);
      throw e;
    }
  }

  injectorGet(token: any, nodeIndex: number, notFoundResult: any): any {
    this._resetDebug();
    try {
      return super.injectorGet(token, nodeIndex, notFoundResult);
    } catch (e) {
      this._rethrowWithContext(e);
      throw e;
    }
  }

  detach(): void {
    this._resetDebug();
    try {
      super.detach();
    } catch (e) {
      this._rethrowWithContext(e);
      throw e;
    }
  }

  destroyLocal() {
    this._resetDebug();
    try {
      super.destroyLocal();
    } catch (e) {
      this._rethrowWithContext(e);
      throw e;
    }
  }

  detectChanges(throwOnChange: boolean): void {
    this._resetDebug();
    try {
      super.detectChanges(throwOnChange);
    } catch (e) {
      this._rethrowWithContext(e);
      throw e;
    }
  }

  private _resetDebug() { this._currentDebugContext = null; }

  debug(nodeIndex: number, rowNum: number, colNum: number): DebugContext {
    return this._currentDebugContext = new DebugContext(this, nodeIndex, rowNum, colNum);
  }

  private _rethrowWithContext(e: any) {
    if (!(e instanceof ViewWrappedError)) {
      if (!(e instanceof ExpressionChangedAfterItHasBeenCheckedError)) {
        this.cdMode = ChangeDetectorStatus.Errored;
      }
      if (isPresent(this._currentDebugContext)) {
        throw new ViewWrappedError(e, this._currentDebugContext);
      }
    }
  }

  eventHandler<E, R>(cb: (eventName: string, event?: E) => R): (eventName: string, event?: E) => R {
    var superHandler = super.eventHandler(cb);
    return (eventName: string, event?: any) => {
      this._resetDebug();
      try {
        return superHandler.call(this, eventName, event);
      } catch (e) {
        this._rethrowWithContext(e);
        throw e;
      }
    };
  }
}

function _findLastRenderNode(node: any): any {
  var lastNode: any;
  if (node instanceof AppElement) {
    var appEl = <AppElement>node;
    lastNode = appEl.nativeElement;
    if (isPresent(appEl.nestedViews)) {
      // Note: Views might have no root nodes at all!
      for (var i = appEl.nestedViews.length - 1; i >= 0; i--) {
        var nestedView = appEl.nestedViews[i];
        if (nestedView.rootNodesOrAppElements.length > 0) {
          lastNode = _findLastRenderNode(
              nestedView.rootNodesOrAppElements[nestedView.rootNodesOrAppElements.length - 1]);
        }
      }
    }
  } else {
    lastNode = node;
  }
  return lastNode;
}
