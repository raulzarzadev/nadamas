export default [
  //----------------------- labels
  {
    id: 'back',
    label: 'Dorso'
  },
  {
    id: 'crawl',
    label: 'Libre'
  },
  {
    id: 'breast',
    label: 'Pecho'
  },
  {
    id: 'butterfly',
    label: 'Maripa'
  },
  {
    id: 'combi',
    label: 'Combi'
  },

  //----------------------- libre o crawl
  {
    label: '50m libre',
    id: '50free'
  },
  {
    label: '100m libre',
    id: '100free'
  },
  {
    label: '200m libre',
    id: '200free'
  },
  {
    label: '400m libre',
    id: '400free'
  },
  {
    label: '800m libre',
    id: '800free'
  },
  {
    label: '1500m libre',
    id: '1500free'
  },
  //----------------------- mariposa
  {
    label: '50m mariposa',
    id: '50butterfly'
  },
  {
    label: '100m mariposa',
    id: '100btterfly'
  },
  {
    label: '200m mariposa',
    id: '200btterfly'
  },
  {
    label: '400m mariposa',
    id: '400btterfly'
  },

  //----------------------- dorso
  {
    label: '50m dorso',
    id: '50back'
  },
  {
    label: '100m dorso',
    id: '100back'
  },
  {
    label: '200m dorso',
    id: '200back'
  },
  {
    label: '400m dorso',
    id: '400back'
  },

  //-----------------------pecho
  {
    label: '50m pecho',
    id: '50bbreast'
  },
  {
    label: '100m pecho',
    id: '100breast'
  },
  {
    label: '200m pecho',
    id: '200breast'
  },
  {
    label: '400m pecho',
    id: '400breast'
  },
  //----------------------- combi
  {
    label: '100m combi',
    id: '100combi'
  },
  {
    label: '200m combi',
    id: '200bcombi'
  },
  {
    label: '400m combi',
    id: '400bcombi'
  }
  //----------------------- relevos
]

export const getStyleInfo = (style) => {
  return STYLES.find(({ id }) => id === style)
}

export const STYLES = [
  {
    label: 'C',
    id: 'crawl',
    largeLabel: 'Crol'
  },
  {
    label: 'D',
    id: 'back',
    largeLabel: 'Dorso'
  },
  {
    label: 'P',
    id: 'breast',
    largeLabel: 'Pecho'
  },
  {
    label: 'M',
    id: 'butterfly',
    largeLabel: 'Mariposa'
  },
  {
    label: 'CI',
    id: 'combi',
    largeLabel: 'Combi'
  }
  /* {
    label: 'RC',
    id: 'rcombi',
    largeLabel: 'Relevos combi'
  },
  {
    label: 'RL',
    id: 'rlibre',
    largeLabel: 'Relevos libre'
  } */
]

export const DISTANCES = [
  {
    label: '25',
    id: '25'
  },
  {
    label: '50',
    id: '50'
  },
  {
    label: '100',
    id: '100'
  },
  {
    label: '200',
    id: '200'
  },
  {
    label: '400',
    id: '400'
  },
  /*
  {
    label: '800',
    id: '800'
  }, */
  /* {
    label: '4x25',
    id: '4x25'
  },
  {
    label: '4x50',
    id: '4x50'
  } */
  ,
]
