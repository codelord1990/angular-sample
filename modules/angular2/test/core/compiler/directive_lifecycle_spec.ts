import {
  AsyncTestCompleter,
  beforeEach,
  xdescribe,
  ddescribe,
  describe,
  el,
  expect,
  iit,
  inject,
  it,
  SpyObject,
  proxy
} from 'angular2/test_lib';

import {DirectiveMetadata, LifecycleEvent} from 'angular2/src/core/metadata';
import {DirectiveBinding} from 'angular2/src/core/compiler/element_injector';
import {RenderDirectiveMetadata} from 'angular2/src/core/render/api';

export function main() {
  describe('Create DirectiveMetadata', () => {
    describe('lifecycle', () => {
      function metadata(type, annotation): RenderDirectiveMetadata {
        return DirectiveBinding.createFromType(type, annotation).metadata;
      }

      describe("onChanges", () => {
        it("should be true when the directive has the onChanges method", () => {
          expect(metadata(DirectiveWithOnChangesMethod, new DirectiveMetadata({})).callOnChanges)
              .toBe(true);
        });

        it("should be true when the lifecycle includes onChanges", () => {
          expect(metadata(DirectiveNoHooks,
                          new DirectiveMetadata({lifecycle: [LifecycleEvent.OnChanges]}))
                     .callOnChanges)
              .toBe(true);
        });

        it("should be false otherwise", () => {
          expect(metadata(DirectiveNoHooks, new DirectiveMetadata()).callOnChanges).toBe(false);
        });

        it("should be false when empty lifecycle", () => {
          expect(metadata(DirectiveWithOnChangesMethod, new DirectiveMetadata({lifecycle: []}))
                     .callOnChanges)
              .toBe(false);
        });
      });

      describe("onDestroy", () => {
        it("should be true when the directive has the onDestroy method", () => {
          expect(metadata(DirectiveWithOnDestroyMethod, new DirectiveMetadata({})).callOnDestroy)
              .toBe(true);
        });

        it("should be true when the lifecycle includes onDestroy", () => {
          expect(metadata(DirectiveNoHooks,
                          new DirectiveMetadata({lifecycle: [LifecycleEvent.OnDestroy]}))
                     .callOnDestroy)
              .toBe(true);
        });

        it("should be false otherwise", () => {
          expect(metadata(DirectiveNoHooks, new DirectiveMetadata()).callOnDestroy).toBe(false);
        });
      });

      describe("onInit", () => {
        it("should be true when the directive has the onInit method", () => {
          expect(metadata(DirectiveWithOnInitMethod, new DirectiveMetadata({})).callOnInit)
              .toBe(true);
        });

        it("should be true when the lifecycle includes onDestroy", () => {
          expect(metadata(DirectiveNoHooks,
                          new DirectiveMetadata({lifecycle: [LifecycleEvent.OnInit]}))
                     .callOnInit)
              .toBe(true);
        });

        it("should be false otherwise", () => {
          expect(metadata(DirectiveNoHooks, new DirectiveMetadata()).callOnInit).toBe(false);
        });
      });

      describe("doCheck", () => {
        it("should be true when the directive has the doCheck method", () => {
          expect(metadata(DirectiveWithOnCheckMethod, new DirectiveMetadata({})).callDoCheck)
              .toBe(true);
        });

        it("should be true when the lifecycle includes doCheck", () => {
          expect(metadata(DirectiveNoHooks,
                          new DirectiveMetadata({lifecycle: [LifecycleEvent.DoCheck]}))
                     .callDoCheck)
              .toBe(true);
        });

        it("should be false otherwise", () => {
          expect(metadata(DirectiveNoHooks, new DirectiveMetadata()).callDoCheck).toBe(false);
        });
      });

      describe("afterContentChecked", () => {
        it("should be true when the directive has the afterContentChecked method", () => {
          expect(metadata(DirectiveWithAfterContentCheckedMethod, new DirectiveMetadata({}))
                     .callAfterContentChecked)
              .toBe(true);
        });

        it("should be true when the lifecycle includes afterContentChecked", () => {
          expect(metadata(DirectiveNoHooks,
                          new DirectiveMetadata({lifecycle: [LifecycleEvent.AfterContentChecked]}))
                     .callAfterContentChecked)
              .toBe(true);
        });

        it("should be false otherwise", () => {
          expect(metadata(DirectiveNoHooks, new DirectiveMetadata()).callAfterContentChecked)
              .toBe(false);
        });
      });
    });
  });
}

class DirectiveNoHooks {}

class DirectiveWithOnChangesMethod {
  onChanges(_) {}
}

class DirectiveWithOnInitMethod {
  onInit() {}
}

class DirectiveWithOnCheckMethod {
  doCheck() {}
}

class DirectiveWithOnDestroyMethod {
  onDestroy(_) {}
}

class DirectiveWithAfterContentCheckedMethod {
  afterContentChecked() {}
}
