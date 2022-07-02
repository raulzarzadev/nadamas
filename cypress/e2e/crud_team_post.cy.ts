describe('Team Posts CRUD', () => {

  it('You can se de team posts', () => {

    cy.login()


    // visit equipo de prueba
    cy.visit('http://localhost:3000/profile')

    cy.contains('(equipo-de-prueba)').click()


  })

  it('create a new post ', () => {

    cy.get('#square-add-post').click()

    cy.get('[id^=modal-nuevo-post]').get('form input[name=title]').type('(post de prueba) <-no brrar Publicación')

    cy.get('#submit-new-post').click()

    cy.contains('guardado', { matchCase: false })

    cy.get('[id^=close-modal-nuevo-post]').click()

    cy.contains('(post de prueba)')
  })


  it('edit (post de prueba)',()=>{
    cy.get('[id^=square-post-\\(post-de-prueba\\)]').click().within(() => {
      // Open modal post details
     cy.get('#button-edit')
    })
  })



  it('delete (post de prueba) ', () => {

    
    // post de prueba exist
    cy.get('[id^=square-post-\\(post-de-prueba\\)]').click().within(() => {
      // Open modal post details
      cy.get('#delete-modal').click()
      cy.get('#handle-delete-modal-button').click()
    })






    // Delete post

    // Opend delete modal
    // cy.get('#delete-modal').click()

    // cy.get('#handle-delete-modal-button').click()


  })

})

export { }
