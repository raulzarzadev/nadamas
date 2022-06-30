describe('Login with google ', () => {
  it('The button loggin with google is working', () => {
    
    cy.visit('http://localhost:3000/')
    
    cy.contains('Ingresar').click()
    
    cy.url()
      .should('include','/login')

      cy.contains('Acepar y continuar').click()
    // cy.contains()
  })
})
