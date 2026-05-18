import MarketplacePreview from '@comps/marketing/marketplace-preview'

export default function FindCoachPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-extrabold">Buscar coach</h1>
      <p className="text-[var(--c-text-2)]">
        Explora coaches, revisa sus horarios reales y agenda tus clases.
      </p>
      <div className="-mx-5 sm:-mx-8">
        <MarketplacePreview />
      </div>
    </div>
  )
}
