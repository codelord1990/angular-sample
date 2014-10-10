import {Map, List, MapWrapper, ListWrapper} from 'facade/collection';
import {Binding, BindingBuilder, bind} from './binding';
import {ProviderError, NoProviderError, InvalidBindingError,
  AsyncBindingError, CyclicDependencyError, InstantiationError} from './exceptions';
import {Type, isPresent, isBlank} from 'facade/lang';
import {Future, FutureWrapper} from 'facade/async';
import {Key} from './key';

var _constructing = new Object();

class _Waiting {
  constructor(future:Future) {
    this.future = future;
  }
}
function _isWaiting(obj):boolean {
  return obj instanceof _Waiting;
}


export class Injector {
  constructor(bindings:List, parent:Injector = null) {
    var flatten = _flattenBindings(bindings, MapWrapper.create());
    this._bindings = this._createListOfBindings(flatten);
    this._instances = this._createInstances();
    this._parent = parent;

    this._asyncStrategy = new _AsyncInjectorStrategy(this);
    this._syncStrategy = new _SyncInjectorStrategy(this);
  }

  get(token) {
    return this._getByKey(Key.get(token), false, false);
  }

  asyncGet(token) {
    return this._getByKey(Key.get(token), true, false);
  }

  createChild(bindings:List):Injector {
    return new Injector(bindings, this);
  }


  _createListOfBindings(flattenBindings):List {
    var bindings = ListWrapper.createFixedSize(Key.numberOfKeys() + 1);
    MapWrapper.forEach(flattenBindings, (keyId, v) => bindings[keyId] = v);
    return bindings;
  }

  _createInstances():List {
    return ListWrapper.createFixedSize(Key.numberOfKeys() + 1);
  }

  _getByKey(key:Key, returnFuture:boolean, returnLazy:boolean) {
    if (returnLazy) {
      return () => this._getByKey(key, returnFuture, false);
    }

    var strategy = returnFuture ? this._asyncStrategy : this._syncStrategy;

    var instance = strategy.readFromCache(key);
    if (isPresent(instance)) return instance;

    instance = strategy.instantiate(key);
    if (isPresent(instance)) return instance;

    if (isPresent(this._parent)) {
      return this._parent._getByKey(key, returnFuture, returnLazy);
    }
    throw new NoProviderError(key);
  }

  _resolveDependencies(key:Key, binding:Binding, forceAsync:boolean):List {
    try {
      var getDependency = d => this._getByKey(d.key, forceAsync || d.asFuture, d.lazy);
      return ListWrapper.map(binding.dependencies, getDependency);
    } catch (e) {
      this._clear(key);
      if (e instanceof ProviderError) e.addKey(key);
      throw e;
    }
  }

  _getInstance(key:Key) {
    if (this._instances.length <= key.id) return null;
    return ListWrapper.get(this._instances, key.id);
  }

  _setInstance(key:Key, obj) {
    ListWrapper.set(this._instances, key.id, obj);
  }

  _getBinding(key:Key) {
    if (this._bindings.length <= key.id) return null;
    return ListWrapper.get(this._bindings, key.id);
  }

  _markAsConstructing(key:Key) {
    this._setInstance(key, _constructing);
  }

  _clear(key:Key) {
    this._setInstance(key, null);
  }
}


class _SyncInjectorStrategy {
  constructor(injector:Injector) {
    this.injector = injector;
  }

  readFromCache(key:Key) {
    if (key.token === Injector) {
      return this.injector;
    }

    var instance = this.injector._getInstance(key);

    if (instance === _constructing) {
      throw new CyclicDependencyError(key);
    } else if (isPresent(instance) && !_isWaiting(instance)) {
      return instance;
    } else {
      return null;
    }
  }

  instantiate(key:Key) {
    var binding = this.injector._getBinding(key);
    if (isBlank(binding)) return null;

    if (binding.providedAsFuture) throw new AsyncBindingError(key);

    //add a marker so we can detect cyclic dependencies
    this.injector._markAsConstructing(key);

    var deps = this.injector._resolveDependencies(key, binding, false);
    return this._createInstance(key, binding, deps);
  }

  _createInstance(key:Key, binding:Binding, deps:List) {
    try {
      var instance = binding.factory(deps);
      this.injector._setInstance(key, instance);
      return instance;
    } catch (e) {
      this.injector._clear(key);
      throw new InstantiationError(e, key);
    }
  }
}


class _AsyncInjectorStrategy {
  constructor(injector:Injector) {
    this.injector = injector;
  }

  readFromCache(key:Key) {
    if (key.token === Injector) {
      return FutureWrapper.value(this.injector);
    }

    var instance = this.injector._getInstance(key);

    if (instance === _constructing) {
      throw new CyclicDependencyError(key);
    } else if (_isWaiting(instance)) {
      return instance.future;
    } else if (isPresent(instance)) {
      return FutureWrapper.value(instance);
    } else {
      return null;
    }
  }

  instantiate(key:Key) {
    var binding = this.injector._getBinding(key);
    if (isBlank(binding)) return null;

    //add a marker so we can detect cyclic dependencies
    this.injector._markAsConstructing(key);

    var deps = this.injector._resolveDependencies(key, binding, true);
    var depsFuture = FutureWrapper.wait(deps);

    var future = FutureWrapper.catchError(depsFuture, (e) => this._errorHandler(key, e)).
      then(deps => this._findOrCreate(key, binding, deps)).
      then(instance => this._cacheInstance(key, instance));

    this.injector._setInstance(key, new _Waiting(future));
    return future;
  }

  _errorHandler(key:Key, e):Future {
    if (e instanceof ProviderError) e.addKey(key);
    return FutureWrapper.error(e);
  }

  _findOrCreate(key:Key, binding:Binding, deps:List) {
    try {
      var instance = this.injector._getInstance(key);
      if (!_isWaiting(instance)) return instance;
      return binding.factory(deps);
    } catch (e) {
      this.injector._clear(key);
      throw new InstantiationError(e, key);
    }
  }

  _cacheInstance(key, instance) {
    this.injector._setInstance(key, instance);
    return instance
  }
}


function _flattenBindings(bindings:List, res:Map) {
  ListWrapper.forEach(bindings, function (b) {
    if (b instanceof Binding) {
      MapWrapper.set(res, b.key.id, b);

    } else if (b instanceof Type) {
      var s = bind(b).toClass(b);
      MapWrapper.set(res, s.key.id, s);

    } else if (b instanceof List) {
      _flattenBindings(b, res);

    } else if (b instanceof BindingBuilder) {
      throw new InvalidBindingError(b.token);

    } else {
      throw new InvalidBindingError(b);
    }
  });
  return res;
}
