export default function Form({ form, athleteId }) {
  return (
    <div className="">
      <div className="relative pt-0 pb-8 max-w-lg mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
          className="relative"
        >
          <div className="flex justify-center">
            {!form?.avatar && (
              <div className=" bottom-0 right-0 flex pt-4">
                <div className="mx-2">Sube una foto</div>
                <UploadImage
                  upladedImage={upladedImage}
                  storeRef={`avatar/${form?.id}`}
                />
              </div>
            )}
            {form?.avatar && (
              <div className=" hidden sm:block relative">
                <Avatar upload id={form.id} image={form?.avatar} />
                <div className="absolute bottom-0 right-0">
                  <UploadImage
                    upladedImage={upladedImage}
                    storeRef={`avatar/${form?.id}`}
                  />
                </div>
              </div>
            )}
            {form?.avatar && (
              <div className="w-full h-28 relative sm:hidden">
                <Image src={form?.avatar} layout="fill" objectFit="cover" />
                <div className="absolute bottom-2 right-2">
                  <UploadImage
                    upladedImage={upladedImage}
                    storeRef={`avatar/${form?.id}`}
                  />
                </div>
              </div>
            )}
            {/*             {form?.id && (
              <div className="absolute bottom-0 left- ">
                <UploadImage
                  upladedImage={upladedImage}
                  storeRef={`avatar/${form.id}`}
                />
              </div>
            )} */}
          </div>

          <div className="sticky top-0 bg-gray-700 z-10 p-2 flex justify-evenly  ">
            {
              /* .-°'*,.-°'*,.-°'*,.-°'*,.-°'*,.-°'*,.-°'*, */
              //   STICKY BAR
              /* .-°'*,.-°'*,.-°'*,.-°'*,.-°'*,.-°'*,.-°'rz */
            }
            <div className="m-2 flex items-center relative">
              <Button
                size="sm"
                disabled={!form?.mobile}
                href={`https://wa.me/521${form?.mobile}?text=${wstext}`}
              >
                <ContactIcon />
              </Button>
            </div>
            <div className="m-2 flex items-center">
              <Button
                size="sm"
                disabled={!form?.email}
                href={`mailto:${form?.email}?subject=Natación`}
              >
                <EmailIcon />
              </Button>
            </div>

            {isEditable && (
              <div className="m-2 flex items-center ">
                <Button
                  disabled={formStatus === 'NEW'}
                  size="sm"
                  variant="secondary"
                >
                  {SAVE_BUTTON_LABEL[formStatus]}
                  <SaveIcon />
                </Button>
              </div>
            )}
          </div>
          {/* ----------------------------------------------Actions  */}
          <div className="flex w-full justify-evenly "></div>
          {/* ----------------------------------------------Personal information */}
          <div className="  ">
           
          </div>

          {/* ----------------------------------------------TEAMS AND GROUPS */}
          {alreadyExist && (
            <Section title={'Equipos'} indent={false}>
              <AthleteTeam athleteId={athleteId} />
            </Section>
          )}
          {/* ----------------------------------------------ESTADISITCAS */}
          {alreadyExist && (
            <Section title={'Estadisticas'} indent={false}>
              <AthleteStatistics athleteId={athleteId} />
            </Section>
          )}

          {/* ----------------------------------------------Tests */}
          {alreadyExist && (
            <Section title={'Pruebas'} indent={false}>
              <Records athlete={form} />
            </Section>
          )}

          {/* ----------------------------------------------Pyments */}
          {alreadyExist && (
            <Section title="Cuotas" indent={false}>
              <Payments athleteId={athleteId} />
            </Section>
          )}

          {/* ----------------------------------------------Schedule */}
          {alreadyExist && (
            <Section title={'Horario'} indent={false}>
              <Schedule athleteId={athleteId} athlete={form} />
            </Section>
          )}

          {/* ----------------------------------------------Contact */}

          <Section title={'Contacto'} indent={false}>
            <div className={`flex flex-col p-1`}>
              <div className="my-1">
                <Text
                  onChange={handleChange}
                  value={form?.mobile}
                  name="mobile"
                  type="tel"
                  label="Celular"
                />
              </div>
              <div className="my-1">
                <Text
                  onChange={handleChange}
                  value={form?.email}
                  name="email"
                  label="email"
                  label="Correo"
                />
              </div>
            </div>
          </Section>

          {/* ----------------------------------------------Medic information */}

          <Section title={'Información médica'} indent={false}>
            <div className={s.medic_info}>
              <Autocomplete
                value={form?.blodType}
                placeholder={'Tipo de Sangre'}
                items={BLOD_TYPES}
                onChange={handleChange}
                name="blodType"
                onSelect={(e) => setForm({ ...form, blodType: e })}
              />
              <Text
                onChange={handleChange}
                name="medicine"
                value={form?.medicine}
                label="Medicamentos o vacunas"
              />
              <Textarea
                onChange={handleChange}
                label="Lesiones"
                value={form?.hurts}
                name="hurts"
              />
              <Textarea
                onChange={handleChange}
                label="Condiciones"
                value={form?.conditions}
                name="conditions"
              />
            </div>
          </Section>

          {/* ----------------------------------------------Emergency contact */}

          <Section title={'Contacto de emergencia'} indent={false}>
            <div className={`flex flex-col  p-1`}>
              <div className="my-1">
                <Text
                  onChange={handleChange}
                  name="emerName"
                  value={form?.emerName}
                  label="Nombre"
                />
              </div>
              <div className="my-1">
                <Text
                  type="tel"
                  onChange={handleChange}
                  name="emerMobile"
                  value={form?.emerMobile}
                  label="Teléfono"
                />
              </div>
              <div className="my-1">
                <Text
                  onChange={handleChange}
                  name="emerTitle"
                  value={form?.emerTitle}
                  label="Perentesco"
                />
              </div>
            </div>
          </Section>
        </form>
        {alreadyExist && (
          <div className="p-4  mx-auto mt-10 ">
            <Button variant="danger" onClick={handleOpenDelete}>
              Eliminar Atleta
            </Button>
          </div>
        )}
        <DeleteModal
          open={openDelete}
          handleDelete={handleDelete}
          name={form?.name}
          handleOpen={handleOpenDelete}
        />
      </div>
    </div>
  )
}
