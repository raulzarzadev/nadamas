


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

    // Login

    cy.login()

    cy.visit('http://localhost:3000/profile')

    // Find a the team created beafore

    cy.contains('Mis equipos')

    cy.contains('Cypress test team').click()

    cy.contains('Opciones').click()

    // Open the molda with edit form 

    cy.get('button[id=open-modal-edit]').click()

    cy.get('#team-form')

    // Edit description

    cy.get('textarea[name=description]').type(' Team description editaded ')

    cy.get('#submit-team').click()

    // Save and wait for de answer

    cy.contains('Guardado')

    // Close modal

    cy.get('#close-modal-Editar').click()

    // Verify if teams are edited

    cy.get('#team-form').should('not.be.visible')

    cy.contains('Team description editaded ')

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
