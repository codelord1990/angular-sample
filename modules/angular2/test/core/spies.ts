import {
  ChangeDetection,
  ChangeDetector,
  ChangeDetectorRef,
  ProtoChangeDetector,
  DynamicChangeDetector
} from 'angular2/src/core/change_detection/change_detection';

import {RenderCompiler, Renderer} from 'angular2/src/core/render/api';
import {DirectiveResolver} from 'angular2/src/core/compiler/directive_resolver';

import {AppView} from 'angular2/src/core/compiler/view';
import {ElementRef} from 'angular2/src/core/compiler/element_ref';
import {AppViewManager} from 'angular2/src/core/compiler/view_manager';
import {AppViewPool} from 'angular2/src/core/compiler/view_pool';
import {AppViewListener} from 'angular2/src/core/compiler/view_listener';
import {DomAdapter} from 'angular2/src/core/dom/dom_adapter';
import {ClientMessageBroker} from 'angular2/src/web_workers/shared/client_message_broker';

import {
  ElementInjector,
  PreBuiltObjects,
  ProtoElementInjector
} from 'angular2/src/core/compiler/element_injector';

import {SpyObject, proxy} from 'angular2/test_lib';

export class SpyDependencyProvider extends SpyObject {}

export class SpyChangeDetection extends SpyObject {
  constructor() { super(ChangeDetection); }
}

export class SpyChangeDetector extends SpyObject {
  constructor() { super(DynamicChangeDetector); }
}

export class SpyProtoChangeDetector extends SpyObject {
  constructor() { super(DynamicChangeDetector); }
}

export class SpyIterableDifferFactory extends SpyObject {}

export class SpyRenderCompiler extends SpyObject {
  constructor() { super(RenderCompiler); }
}

export class SpyDirectiveResolver extends SpyObject {
  constructor() { super(DirectiveResolver); }
}

export class SpyView extends SpyObject {
  constructor() { super(AppView); }
}

export class SpyElementRef extends SpyObject {
  constructor() { super(ElementRef); }
}

export class SpyAppViewManager extends SpyObject {
  constructor() { super(AppViewManager); }
}

export class SpyRenderer extends SpyObject {
  constructor() { super(Renderer); }
}

export class SpyAppViewPool extends SpyObject {
  constructor() { super(AppViewPool); }
}

export class SpyAppViewListener extends SpyObject {
  constructor() { super(AppViewListener); }
}

export class SpyProtoElementInjector extends SpyObject {
  constructor() { super(ProtoElementInjector); }
}

export class SpyElementInjector extends SpyObject {
  constructor() { super(ElementInjector); }
}

export class SpyPreBuiltObjects extends SpyObject {
  constructor() { super(PreBuiltObjects); }
}

export class SpyDomAdapter extends SpyObject {
  constructor() { super(DomAdapter); }
}