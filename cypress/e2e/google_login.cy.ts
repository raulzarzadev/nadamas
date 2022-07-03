


describe('Login with google ', () => {
  
  it('The button loggin with google is working', () => {

    cy.visit('http://localhost:3000/')

    cy.contains('Ingresar').click()


    // *  firebase bypasss  https://youtu.be/JqEzA44Lsts?t=265
    cy.url()
      .should('include', '/login')

    cy.login()

    cy.contains('Acepar y continuar').click()

    cy.contains('Ingresar con Google').click()

    cy.contains('Perfil')

  })
  afterEach(() => {
    cy.logout()
  })

  it('Login and redirect to profile manualy', () => {

    cy.visit('http://localhost:3000/')

    cy.login()

    cy.get('#nav-menu').click()

    cy.get('#dropdown-menu')
      .should('be.visible')
      .contains('Perfil')
      .click()

    cy.url()
      .should('include', '/profile')

  })
})



export { }
