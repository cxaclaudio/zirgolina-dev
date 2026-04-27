"use client";
import dynamic from "next/dynamic";
import FilterPanel from "@/components/FilterPanel";
import LocationRadiusPanel from "@/components/LocationRadiusPanel";
import HomeHeader from "@/components/HomeHeader";
import CalculatorOverlay from "@/components/CalculatorOverlay";
import DonationModal from "@/components/DonationModal";
import PostosListPanel from "@/components/PostosListPanel";
import { useTheme } from "@/components/ThemeProvider";
import { useHomePageLogic } from "@/hooks/useHomePageLogic";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.78rem",
        color: "var(--text-muted)",
      }}
    >
      A carregar mapa…
    </div>
  ),
});

const HEADER_H = 56;

const CRIPTO = [
  {
    label: "XMR Address",
    addr: "45CQZ4nvwVC4L2x5BTN5F3iZBzW6oqjt6XzNLcm3mocpGKNmAaUAs7DJAddCCMpF1nKUa3Apybw8cDtmNvbFVSux2yZPXaf",
  },
  { label: "BTC Address", addr: "bc1qc7ahx5r0vhrlvmsg54kyk599yyh86fvl7thmsv" },
  { label: "ETH Address", addr: "0x985b833D87AD530790212440C8A3FA751BBC9b90" },
];

export default function Home() {
  const { dark, toggle } = useTheme();

  const {
    loading,
    geoLoading,
    geoError,
    activeRadiusKm,
    error,
    fuelId,
    distritoAtivo,
    municipioAtivo,
    ordenacao,
    mapaOpen,
    calcOpen,
    doarOpen,
    copiedAddr,
    hasSearched,
    isMobileView,
    calcAnchor,
    calcBtnRef,
    calcPopoverRef,
    mapFlyRefDesktop,
    mapFlyRefMobile,
    mapInvalidateRefDesktop,
    mapInvalidateRefMobile,
    setOrdenacao,
    setMapaOpen,
    setCalcOpen,
    setDoarOpen,
    handleSearchByRadius,
    handleRadiusMarcaChange,
    handleFilterChange,
    handleSearch,
    handleCopy,
    updateCalcPosition,
    postos,
    postosVisiveis,
    sortedPostos,
    cheapestPrice,
    tipoAtivo,
    hasMarca,
    hasMunicipioSelecionado,
    hasRadiusSearch,
    hasQueryContext,
    busy,
    mapProps,
    showRadiusMarcaFilter,
    radiusMarcaId,
    availableRadiusMarcas,
  } = useHomePageLogic();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{`
        @media (max-width: 900px) {
          .main-grid { grid-template-columns: 1fr !important; }
          .mapa-col  { display: none !important; }
          .lista-col  { order: 1; }
          .filtros-col { order: 0; }
          .mobile-actions { display: flex !important; }
          .desktop-only { display: none !important; }
          .calc-sidebar { display: none !important; }
        }
        @media (min-width: 901px) {
          .mobile-actions { display: none !important; }
          .filtros-col {
            position: sticky;
            top: ${HEADER_H + 8}px;
            max-height: calc(100vh - ${HEADER_H + 24}px);
            overflow-y: auto;
          }
        }
      `}</style>

      <HomeHeader
        dark={dark}
        toggleTheme={toggle}
        onOpenMap={() => {
          setMapaOpen(true);
          setCalcOpen(false);
          setTimeout(() => mapInvalidateRefMobile.current?.(), 200);
        }}
        onToggleCalc={() => {
          setMapaOpen(false);

          if (isMobileView) {
            setCalcOpen(true);
            return;
          }

          if (!calcOpen) updateCalcPosition();
          setCalcOpen((v) => !v);
        }}
        onOpenDonate={() => setDoarOpen(true)}
        calcBtnRef={calcBtnRef}
        headerHeight={HEADER_H}
      />

      <div
        className="main-grid"
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "1rem 1.25rem",
          display: "grid",
          gridTemplateColumns: "280px 540px 1fr",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <div className="filtros-col">
          <LocationRadiusPanel
            loading={loading}
            geoLoading={geoLoading}
            geoError={geoError}
            activeRadiusKm={activeRadiusKm}
            onSearchByRadius={handleSearchByRadius}
            showRadiusMarcaFilter={showRadiusMarcaFilter}
            radiusMarcaId={radiusMarcaId}
            availableRadiusMarcas={availableRadiusMarcas}
            onRadiusMarcaChange={handleRadiusMarcaChange}
          />

          <FilterPanel
            onChange={handleFilterChange}
            onSearch={handleSearch}
            loading={loading}
            total={postosVisiveis.length}
            currentFuelId={fuelId}
            distritoAtivo={distritoAtivo}
            municipioAtivo={municipioAtivo}
            cheapestPrice={cheapestPrice}
          />
        </div>

        <PostosListPanel
          dark={dark}
          busy={busy}
          loading={loading}
          geoLoading={geoLoading}
          error={error}
          postos={postos}
          postosVisiveis={postosVisiveis}
          sortedPostos={sortedPostos}
          hasSearched={hasSearched}
          hasMarca={hasMarca}
          distritoAtivo={distritoAtivo}
          hasMunicipioSelecionado={hasMunicipioSelecionado}
          hasQueryContext={hasQueryContext}
          hasRadiusSearch={hasRadiusSearch}
          activeRadiusKm={activeRadiusKm}
          ordenacao={ordenacao}
          setOrdenacao={setOrdenacao}
          tipoAtivo={tipoAtivo}
        />

        <div
          className="card mapa-col"
          style={{
            overflow: "hidden",
            position: "sticky",
            top: HEADER_H + 8,
            height: `calc(100vh - ${HEADER_H + 24}px)`,
          }}
        >
          <MapView
            key="desktop"
            {...mapProps}
            flyRef={mapFlyRefDesktop}
            invalidateRef={mapInvalidateRefDesktop}
          />
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          transform: mapaOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.25s ease",
          pointerEvents: mapaOpen ? "auto" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1rem",
            height: HEADER_H,
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Mapa</span>
          <button
            onClick={() => setMapaOpen(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "1.4rem",
              lineHeight: 1,
              padding: "0.2rem",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <MapView
            key="mobile"
            {...mapProps}
            flyRef={mapFlyRefMobile}
            invalidateRef={mapInvalidateRefMobile}
          />
        </div>
      </div>

      <CalculatorOverlay
        open={calcOpen}
        isMobileView={isMobileView}
        onClose={() => setCalcOpen(false)}
        dark={dark}
        calcAnchor={calcAnchor}
        calcPopoverRef={calcPopoverRef}
        headerHeight={HEADER_H}
      />

      <DonationModal
        open={doarOpen}
        onClose={() => setDoarOpen(false)}
        items={CRIPTO}
        copiedAddr={copiedAddr}
        onCopy={handleCopy}
      />
    </div>
  );
}