/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {Inject, Injectable} from '@angular/core';

import {Options} from '../common_options';
import {WebDriverAdapter} from '../web_driver_adapter';
import {PerfLogEvent, PerfLogFeatures, WebDriverExtension} from '../web_driver_extension';

/**
 * Set the following 'traceCategories' to collect metrics in Chrome:
 * 'v8,blink.console,disabled-by-default-devtools.timeline,devtools.timeline'
 *
 * In order to collect the frame rate related metrics, add 'benchmark'
 * to the list above.
 */
@Injectable()
export class ChromeDriverExtension extends WebDriverExtension {
  static PROVIDERS = [ChromeDriverExtension];

  private _majorChromeVersion: number;

  constructor(private _driver: WebDriverAdapter, @Inject(Options.USER_AGENT) userAgent: string) {
    super();
    this._majorChromeVersion = this._parseChromeVersion(userAgent);
  }

  private _parseChromeVersion(userAgent: string): number {
    if (!userAgent) {
      return -1;
    }
    var v = userAgent.split(/Chrom(e|ium)\//g)[2];
    if (!v) {
      return -1;
    }
    v = v.split('.')[0];
    if (!v) {
      return -1;
    }
    return parseInt(v, 10);
  }

  gc() { return this._driver.executeScript('window.gc()'); }

  timeBegin(name: string): Promise<any> {
    return this._driver.executeScript(`console.time('${name}');`);
  }

  timeEnd(name: string, restartName: string = null): Promise<any> {
    var script = `console.timeEnd('${name}');`;
    if (restartName) {
      script += `console.time('${restartName}');`;
    }
    return this._driver.executeScript(script);
  }

  // See [Chrome Trace Event
  // Format](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit)
  readPerfLog(): Promise<PerfLogEvent[]> {
    // TODO(tbosch): Chromedriver bug https://code.google.com/p/chromedriver/issues/detail?id=1098
    // Need to execute at least one command so that the browser logs can be read out!
    return this._driver.executeScript('1+1')
        .then((_) => this._driver.logs('performance'))
        .then((entries) => {
          var events: PerfLogEvent[] = [];
          entries.forEach(entry => {
            var message = JSON.parse(entry['message'])['message'];
            if (message['method'] === 'Tracing.dataCollected') {
              events.push(message['params']);
            }
            if (message['method'] ===  'Tracing.bufferUsage') {
              throw new Error('The DevTools trace buffer filled during the test!');
            }
          });
          return this._convertPerfRecordsToEvents(events);
        });
  }

  private _convertPerfRecordsToEvents(
      chromeEvents: Array<{[key: string]: any}>, normalizedEvents: PerfLogEvent[] = null) {
    if (!normalizedEvents) {
      normalizedEvents = [];
    }
    var majorGCPids = {};
    chromeEvents.forEach((event) => {
      var categories = this._parseCategories(event['cat']);
      var name = event['name'];
      if (this._isEvent(categories, name, ['blink.console'])) {
        normalizedEvents.push(normalizeEvent(event, {'name': name}));
      } else if (this._isEvent(
                     categories, name, ['benchmark'],
                     'BenchmarkInstrumentation::ImplThreadRenderingStats')) {
        // TODO(goderbauer): Instead of BenchmarkInstrumentation::ImplThreadRenderingStats the
        // following events should be used (if available) for more accurate measurments:
        //   1st choice: vsync_before - ground truth on Android
        //   2nd choice: BenchmarkInstrumentation::DisplayRenderingStats - available on systems with
        //               new surfaces framework (not broadly enabled yet)
        //   3rd choice: BenchmarkInstrumentation::ImplThreadRenderingStats - fallback event that is
        //               always available if something is rendered
        var frameCount = event['args']['data']['frame_count'];
        if (frameCount > 1) {
          throw new Error('multi-frame render stats not supported');
        }
        if (frameCount == 1) {
          normalizedEvents.push(normalizeEvent(event, {'name': 'frame'}));
        }
      } else if (
          this._isEvent(categories, name, ['disabled-by-default-devtools.timeline'], 'Rasterize') ||
          this._isEvent(
              categories, name, ['disabled-by-default-devtools.timeline'], 'CompositeLayers')) {
        normalizedEvents.push(normalizeEvent(event, {'name': 'render'}));
      } else if (this._majorChromeVersion < 45) {
        var normalizedEvent = this._processAsPreChrome45Event(event, categories, majorGCPids);
        if (normalizedEvent != null) normalizedEvents.push(normalizedEvent);
      } else {
        var normalizedEvent = this._processAsPostChrome44Event(event, categories);
        if (normalizedEvent != null) normalizedEvents.push(normalizedEvent);
      }
    });
    return normalizedEvents;
  }

  private _processAsPreChrome45Event(
      event: {[key: string]: any}, categories: string[], majorGCPids: {[key: string]: any}) {
    var name = event['name'];
    var args = event['args'];
    var pid = event['pid'];
    var ph = event['ph'];
    if (this._isEvent(
            categories, name, ['disabled-by-default-devtools.timeline'], 'FunctionCall') &&
        (!args || !args['data'] ||
         args['data']['scriptName'] !==  'InjectedScript')) {
      return normalizeEvent(event, {'name': 'script'});
    } else if (
        this._isEvent(
            categories, name, ['disabled-by-default-devtools.timeline'], 'RecalculateStyles') ||
        this._isEvent(categories, name, ['disabled-by-default-devtools.timeline'], 'Layout') ||
        this._isEvent(
            categories, name, ['disabled-by-default-devtools.timeline'], 'UpdateLayerTree') ||
        this._isEvent(categories, name, ['disabled-by-default-devtools.timeline'], 'Paint')) {
      return normalizeEvent(event, {'name': 'render'});
    } else if (this._isEvent(
                   categories, name, ['disabled-by-default-devtools.timeline'], 'GCEvent')) {
      var normArgs: {[key: string]: any} = {
        'usedHeapSize': args['usedHeapSizeAfter'] ? args['usedHeapSizeAfter'] :
                                                               args['usedHeapSizeBefore']
      };
      if (ph ===  'E') {
        normArgs['majorGc'] = majorGCPids[pid] && majorGCPids[pid];
      }
      majorGCPids[pid] = false;
      return normalizeEvent(event, {'name': 'gc', 'args': normArgs});
    } else if (
        this._isEvent(categories, name, ['v8'], 'majorGC') && ph ===  'B') {
      majorGCPids[pid] = true;
    }
    return null;  // nothing useful in this event
  }

  private _processAsPostChrome44Event(event: {[key: string]: any}, categories: string[]) {
    var name = event['name'];
    var args = event['args'];
    if (this._isEvent(categories, name, ['devtools.timeline', 'v8'], 'MajorGC')) {
      var normArgs = {
        'majorGc': true,
        'usedHeapSize': args['usedHeapSizeAfter'] !== undefined ? args['usedHeapSizeAfter'] :
                                                               args['usedHeapSizeBefore']
      };
      return normalizeEvent(event, {'name': 'gc', 'args': normArgs});
    } else if (this._isEvent(categories, name, ['devtools.timeline', 'v8'], 'MinorGC')) {
      var normArgs = {
        'majorGc': false,
        'usedHeapSize': args['usedHeapSizeAfter'] !== undefined ? args['usedHeapSizeAfter'] :
                                                               args['usedHeapSizeBefore']
      };
      return normalizeEvent(event, {'name': 'gc', 'args': normArgs});
    } else if (
        this._isEvent(categories, name, ['devtools.timeline'], 'FunctionCall') &&
        (!args || !args['data'] ||
         (args['data']['scriptName'] !==  'InjectedScript' &&
          args['data']['scriptName'] !==  ''))) {
      return normalizeEvent(event, {'name': 'script'});
    } else if (this._isEvent(
                   categories, name, ['devtools.timeline', 'blink'], 'UpdateLayoutTree')) {
      return normalizeEvent(event, {'name': 'render'});
    } else if (
        this._isEvent(categories, name, ['devtools.timeline'], 'UpdateLayerTree') ||
        this._isEvent(categories, name, ['devtools.timeline'], 'Layout') ||
        this._isEvent(categories, name, ['devtools.timeline'], 'Paint')) {
      return normalizeEvent(event, {'name': 'render'});
    } else if (this._isEvent(categories, name, ['devtools.timeline'], 'ResourceReceivedData')) {
      let normArgs = {'encodedDataLength': args['data']['encodedDataLength']};
      return normalizeEvent(event, {'name': 'receivedData', 'args': normArgs});
    } else if (this._isEvent(categories, name, ['devtools.timeline'], 'ResourceSendRequest')) {
      let data = args['data'];
      let normArgs = {'url': data['url'], 'method': data['requestMethod']};
      return normalizeEvent(event, {'name': 'sendRequest', 'args': normArgs});
    } else if (this._isEvent(categories, name, ['blink.user_timing'], 'navigationStart')) {
      return normalizeEvent(event, {'name': name});
    }
    return null;  // nothing useful in this event
  }

  private _parseCategories(categories: string): string[] { return categories.split(','); }

  private _isEvent(
      eventCategories: string[], eventName: string, expectedCategories: string[],
      expectedName: string = null): boolean {
    var hasCategories = expectedCategories.reduce(
        (value, cat) => { return value && eventCategories.indexOf(cat) !== -1; }, true);
    return !expectedName ? hasCategories :
                                   hasCategories && eventName ===  expectedName;
  }

  perfLogFeatures(): PerfLogFeatures {
    return new PerfLogFeatures({render: true, gc: true, frameCapture: true, userTiming: true});
  }

  supports(capabilities: {[key: string]: any}): boolean {
    return this._majorChromeVersion != -1 &&
        capabilities['browserName'].toLowerCase() ===  'chrome';
  }
}

function normalizeEvent(
    chromeEvent: {[key: string]: any}, data: {[key: string]: any}): PerfLogEvent {
  var ph = chromeEvent['ph'];
  if (ph ===  'S') {
    ph = 'b';
  } else if (ph ===  'F') {
    ph = 'e';
  }
  var result: {[key: string]: any} =
      {'pid': chromeEvent['pid'], 'ph': ph, 'cat': 'timeline', 'ts': chromeEvent['ts'] / 1000};
  if (chromeEvent['ph'] === 'X') {
    var dur = chromeEvent['dur'];
    if (dur === undefined) {
      dur = chromeEvent['tdur'];
    }
    result['dur'] = !dur ? 0.0 : dur / 1000;
  }
  for (let prop in data) {
    result[prop] = data[prop];
  }
  return result;
}
