/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ApplicationRef, NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserModule} from '@angular/platform-browser';

import {AnimateCmp} from './animate';
import {BasicComp} from './basic';
import {CompWithAnalyzeEntryComponentsProvider, CompWithEntryComponents} from './entry_components';
import {CompWithProviders, CompWithReferences} from './features';
import {CompUsingRootModuleDirectiveAndPipe, SomeDirectiveInRootModule, SomeLibModule, SomePipeInRootModule, SomeService} from './module_fixtures';
import {ProjectingComp} from './projection';
import {CompWithChildQuery, CompWithDirectiveChild} from './queries';

@NgModule({
  declarations: [
    SomeDirectiveInRootModule, SomePipeInRootModule, AnimateCmp, BasicComp, CompWithEntryComponents,
    CompWithAnalyzeEntryComponentsProvider, ProjectingComp, CompWithChildQuery,
    CompWithDirectiveChild, CompUsingRootModuleDirectiveAndPipe, CompWithProviders,
    CompWithReferences
  ],
  imports: [BrowserModule, FormsModule, SomeLibModule],
  providers: [SomeService],
  entryComponents: [
    AnimateCmp, BasicComp, CompWithEntryComponents, CompWithAnalyzeEntryComponentsProvider,
    ProjectingComp, CompWithChildQuery, CompUsingRootModuleDirectiveAndPipe
  ]
})
export class MainModule {
  constructor(public appRef: ApplicationRef) {}
}
