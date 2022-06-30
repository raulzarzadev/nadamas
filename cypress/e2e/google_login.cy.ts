describe('Login with google ', () => {
  it('The button loggin with google is working', () => {
    
    cy.visit('http://localhost:3000/')
    
    cy.contains('Ingresar').click()
    
    cy.url()
      .should('include','/login')

      cy.contains('Acepar y continuar').click()
      // * TODO firebase bypasss  https://youtu.be/JqEzA44Lsts?t=265
      cy.contains('Ingresar con Google').click()
  })
})
