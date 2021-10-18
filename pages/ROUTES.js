export default function Routes() {
  return <div className=""></div>
}

export const ROUTES = {
  teams: {
    index: '/teams',
    new: function () {
      return `${this.index}/new`
    },
    details: function(id){
      return`${this.index}/${id}`
    }
  }
}
