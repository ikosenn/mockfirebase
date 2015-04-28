'use strict'

import {posix as posixPath} from 'path'
import assert from 'assert'
import last from 'array-last'
import * as url from './url'
import {Queue} from './queue'
import Cache from './cache'
import Clock from './clock'
import Map from './map'
import {dispatch} from './events'
import {fromJS as toImmutable} from 'immutable'
import {random as randomEndpoint, parse as parseUrl} from './url'

const {join, resolve} = posixPath

export default class MockFirebase {
  static cache = new Cache()
  static clock = new Clock()
  static ServerValue = {
    TIMESTAMP: {
      '.sv': 'timestamp'
    }
  }
  constructor (url = randomEndpoint(), root) {
    Object.assign(this, parseUrl(url)) // eslint-disable-line no-undef
    if (this.isRoot) {
      const cache = this.constructor.cache
      const cached = cache.get(this.endpoint)
      if (cached) return cached
      cache.set(this.endpoint, this)
      this.data = new Map()
      this.setData = (data) => {
        const diff = this.data.diff(data)
        this.data = data
        dispatch(this.listeners, diff)
      }
    } else {
      this._root = root || new this.constructor(this.endpoint)
    }
    this.queue = this.isRoot ? new Queue() : this.root().queue
  }
  flush () {
    this.queue.flush()
    return this
  }
  getFlushQueue () {
    return this.queue.getEvents()
  }
  get keyPath () {
    return this.path.split('/').slice(1)
  }
  getData () {
    const value = this.root().data.getIn(this.keyPath, null)
    return Map.isMap(value) ? value.toJS() : value
  }
  parent () {
    return this.isRoot ? null : new this.constructor(url.format({
      endpoint: this.endpoint,
      path: resolve(this.path, '..')
    }), this.root())
  }
  ref () {
    return this
  }
  root () {
    return this.isRoot ? this : this._root
  }
  child (path) {
    assert(path && typeof path === 'string', '"path" must be a string')
    return new this.constructor(url.format({
      endpoint: this.endpoint,
      path: join(this.path, path)
    }), this.root())
  }
  key () {
    return last(this.path.split('/')) || null
  }
  toString () {
    return this.url
  }
}
