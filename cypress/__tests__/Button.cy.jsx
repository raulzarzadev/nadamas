import { mount } from 'cypress/react'
import '../../components/Inputs/Button'

describe('<Button >', () => {
  it('mount', () => {
    mount(<Button label={'Hola'} />, { stylesheet: '../../styles/tailwind-generated.css' })
  })
})
