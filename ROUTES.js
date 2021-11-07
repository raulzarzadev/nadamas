export const ROUTES = {
  groups: {
    index: '/groups'
  },
  athletes: {
    index: '/athletes',
    new: function () {
      return `${this.index}/new`
    },
    details: function (id) {
      return `${this.index}/${id}`
    }
  },
  records: {
    index: '/records',
    new: function () {
      return `${this.index}/new`
    },
    details: function (id) {
      return `${this.index}/${id}`
    }
  },
  teams: {
    index: '/teams',
    new: function () {
      return `${this.index}/new`
    },
    details: function (id) {
      return `${this.index}/${id}`
    }
  },
  events: {
    index: '/events',
    new: function () {
      return `${this.index}/new`
    },
    details: function (id) {
      return `${this.index}/${id}`
    },
    edit: function (id) {
      return `${this.index}/${id}/edit`
    },
    results: function (id) {
      return `${this.index}/${id}/results`
    }
  }
}
