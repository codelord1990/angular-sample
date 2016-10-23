/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {verifyNoBrowserErrors} from 'e2e_util/e2e_util';

function waitForElement(selector: string) {
  const EC = protractor.ExpectedConditions;
  // Waits for the element with id 'abc' to be present on the dom.
  browser.wait(EC.presenceOf($(selector)), 20000);
}

describe('relative assets relative-app', () => {

  afterEach(verifyNoBrowserErrors);

  const URL = 'all/playground/src/relative_assets/';

  it('should load in the templateUrl relative to the my-cmp component', () => {
    browser.get(URL);

    waitForElement('my-cmp .inner-container');
    expect(element.all(by.css('my-cmp .inner-container')).count()).toEqual(1);
  });

  it('should load in the styleUrls relative to the my-cmp component', () => {
    browser.get(URL);

    waitForElement('my-cmp .inner-container');
    const elem = element(by.css('my-cmp .inner-container'));
    const width = browser.executeScript(
        (e: Element) => parseInt(window.getComputedStyle(e).width), elem.getWebElement());

    expect(width).toBe(432);
  });
});
