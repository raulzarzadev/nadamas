export default function Routes() {
  return <div className=""></div>
}

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
  }
}
