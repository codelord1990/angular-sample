import {WatchGroup} from './watch_group';


/**
 * Represents a Record for keeping track of changes. A change is a difference between previous
 * and current value. 
 * 
 * By default changes are detected using dirty checking, but a notifier can be present which can
 * notify the records of changes by means other than dirty checking. For example Object.observe
 * or events on DOM elements.
 * 
 * DESIGN NOTES:  
 *  - No inheritance allowed so that code is monomorphic for performance. 
 *  - Atomic watch operations
 *  - Defaults to dirty checking
 *  - Keep this object as lean as possible. (Lean in number of fields)
 * 
 * MEMORY COST: 13 Words;
 */
export class Record {
  
  @FIELD('final _watchGroup:WatchGroup')
  @FIELD('final _protoRecord:ProtoRecord')
  @FIELD('_context')
  @FIELD('_getter')
  @FIELD('_arguments')
  @FIELD('_previousValue')
  @FIELD('_mode:int')
  /// order list of all records. Including head/tail markers
  @FIELD('_next:Record')
  @FIELD('_prev:Record')
  /// next record to dirty check 
  @FIELD('_checkNext:Record')
  @FIELD('_checkPrev:Record')
  // next notifier
  @FIELD('_notifierNext:Record')
  // notifier context will be present to the notifier to release
  // the object from notification/watching.
  @FIELD('_notifierContext')
  // Opeque data which will be presented to WatchGroupDispatcher
  @FIELD('_watchContext')
  // IF we detect change, we have to update the _context of the
  // next record.
  @FIELD('_updateContext:Record')
  // May be removed if we don't support coelsence.
  @FIELD('_updateContextNext:Record')
  constructor() {
  }

  check():bool {
    var mode = this.mode;
    var state = mode & MODE_MASK_STATE;
    var notify = mode & MODE_MASK_NOTIFY;
    var currentValue;
    switch (state) {
      case MODE_STATE_MARKER: 
        return false;
      case MODE_STATE_PROPERTY:
        currentValue = this._getter(this._context);
        break;
      case MODE_STATE_INVOKE_CLOSURE:
        currentValue = this._context(this._arguments);
        break;
      case MODE_STATE_INVOKE_METHOD:
        currentValue = this._getter(this._context, this._arguments);
        break;
      case MODE_STATE_MAP:
      case MODE_STATE_LIST:
    }
    var previousValue = this._previousValue;
    if (isSame(previousValue, currentValue)) return false;
    if (previousValue instanceof String && currentValue instanceof String  
        && previousValue == currentValue) {
      this._previousValue = currentValue;
      return false
    }
    this.previousValue = previousValue;
    return true;
  }
}

// The mode is devided into two partes. Which notification mechanism
// to use and which dereference mode to execute.

// We use dirty checking aka no notification
var MODE_MASK_NOTIFY:number = 0xFF00;
// Encodes the state of dereference
var MODE_MASK_STATE:int = 0x00FF;

var MODE_PLUGIN_DIRTY_CHECK:int = 0x0000;
var MODE_STATE_MARKER:int = 0x0000;

/// _context[_protoRecord.propname] => _getter(_context)
var MODE_STATE_PROPERTY:int = 0x0001;
/// _context(_arguments)
var MODE_STATE_INVOKE_CLOSURE:int = 0x0002;
/// _getter(_context, _arguments)
var MODE_STATE_INVOKE_METHOD:int = 0x0003;

/// _context is Map => _previousValue is MapChangeRecord
var MODE_STATE_MAP:int = 0x0004;
/// _context is Array/List/Iterable => _previousValue = ListChangeRecord
var MODE_STATE_LIST:int = 0x0005;

function isSame(a, b) {
  if (a === b) {
    return true;
  } else if ((a !== a) && (b !== b)) {
    return true;
  } else {
    return false;
  }
} 
