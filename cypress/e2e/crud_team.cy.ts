


describe('Team CRUD', () => {


  it('Create team', () => {

    cy.login()

    cy.visit('http://localhost:3000/profile')

    cy.contains('Mis equipos')

    cy.get('#new-team')
      .click()

    cy.get('#team-form')

    cy.get('input[name=name]').type('Cypress test team')

    cy.get('textarea[name=description]').type('Description cypress team test')

    // cy.get('input[name=isPublic]').click()

    cy.get('#submit-team').click()

    cy.url()
      .should('include', '/teams/')

    cy.contains('Opciones')

  })

  it('Find team and edit it', () => {
    cy.login()

    cy.visit('http://localhost:3000/profile')

    cy.contains('Mis equipos')

    cy.contains('Cypress test team').click()

    cy.contains('Opciones').click()

    cy.get('button[id=edit-modal]').click()


  })


  it('Find team and delete', () => {
    cy.login()

    cy.visit('http://localhost:3000/profile')

    cy.contains('Mis equipos')

    cy.contains('Cypress test team').click()

    cy.contains('Opciones').click()

    cy.get('button[id=delete-modal]').click()

    cy.get('#handle-delete-modal-button').click()

  })

  /* 
    after(() => {
      cy.logout()
    }) */
})

export { }
