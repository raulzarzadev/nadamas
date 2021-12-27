export default function Users({ users }) {
  return (
    <div className="">
      <div>
        <div className="flex flex-wrap justify-center ">
          {users?.map((user) => (
            <div
              className={`relative w-1/6 text-xs m-1 truncate ${
                filterBy?.value === user?.id && 'border'
              }`}
              key={user.id}
              onClick={() => handleSetFilter('userId', user.id)}
            >
              {user.name}
            </div>
          ))}
        </div>
        <div>
          Usuario:
          <div className="flex">
            <div className="w-1/12">Coach</div>
          </div>
          {userSelected && (
            <div>
              <div className="flex justify-between items-center">
                <input
                  className="w-1/12"
                  checked={userSelected?.coach}
                  type="checkbox"
                />
                {`${userSelected?.name} ${userSelected?.lastName || 'sin'}  ${
                  userSelected?.email
                } ${
                  userSelected?.joinedAt &&
                  formatDistanceToNowStrict(userSelected?.joinedAt)
                }`}
                <div className="relative" onClick={() => copy(userSelected.id)}>
                  id
                  {visible && value === userSelected.id && (
                    <div className="absolute -right-20 -top-2 bg-success text-dark">
                      id copiado
                    </div>
                  )}
                </div>
                <div>
                  <Button
                    iconOnly
                    onClick={handleOpenDeleteUser}
                    size="xs"
                    variant="danger"
                  >
                    <TrashBinIcon />
                  </Button>
                  <DeleteModal
                    handleOpen={handleOpenDeleteUser}
                    open={openDeleteUser}
                    title="Eliminar usuario"
                    handleDelete={() => handleDeleteUser(userSelected.id)}
                  />
                </div>
              </div>
              <div className="border min-h-[100px]">
                <h3>Configuración:</h3>
                <div>{/*                     {limits} */}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
