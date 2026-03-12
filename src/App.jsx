import { useState, useMemo, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, setDoc, getDoc
} from "firebase/firestore";

const CATEGORIAS = [
  "Vinilo Impreso", "Vinilo Calado", "Diseño", "Impresiones",
  "DTF", "Sublimado", "Estampado", "Talonarios", "Lona", "Otros"
];

const CATEGORIA_ICON = {
  "Vinilo Impreso": "🖨️", "Vinilo Calado": "✂️", "Diseño": "🎨",
  "Impresiones": "📄", "DTF": "👕", "Sublimado": "🌈",
  "Estampado": "🔖", "Talonarios": "📒", "Lona": "🪧", "Otros": "📦"
};

const CATEGORIA_COLOR = {
  "Vinilo Impreso": { bg: "#e3f2fd", text: "#0d47a1", accent: "#1976d2" },
  "Vinilo Calado":  { bg: "#e8eaf6", text: "#283593", accent: "#3949ab" },
  "Diseño":         { bg: "#fce4ec", text: "#880e4f", accent: "#e91e63" },
  "Impresiones":    { bg: "#e0f2f1", text: "#004d40", accent: "#009688" },
  "DTF":            { bg: "#fff3e0", text: "#e65100", accent: "#ff9800" },
  "Sublimado":      { bg: "#f3e5f5", text: "#4a148c", accent: "#9c27b0" },
  "Estampado":      { bg: "#fff8e1", text: "#f57f17", accent: "#ffc107" },
  "Talonarios":     { bg: "#e8f5e9", text: "#1b5e20", accent: "#4caf50" },
  "Lona":           { bg: "#efebe9", text: "#3e2723", accent: "#795548" },
  "Otros":          { bg: "#f5f5f5", text: "#424242", accent: "#9e9e9e" },
};

const ESTADOS = ["Todos", "Pendiente", "En Producción", "Listo", "Entregado"];
const ESTADO_COLOR = {
  Pendiente:        { bg: "#f5f5f5", text: "#616161" },
  "En Producción":  { bg: "#e3f2fd", text: "#0d47a1" },
  Listo:            { bg: "#fff8e1", text: "#f57f17" },
  Entregado:        { bg: "#e8f5e9", text: "#1b5e20" },
};

const EMPTY_FORM = {
  nombre: "", cliente: "", telefono: "", categoria: "Vinilo Impreso",
  estado: "Pendiente", fechaPedido: "", fechaEntrega: "", precio: "",
  seña: "", notas: ""
};



const EMPTY_EMPRESA = {
  nombre: "Mafalda Gráfica", titular: "", cuit: "",
  direccion: "", telefono: "", logo: ""
};

// ── HTML de la orden de trabajo para imprimir ──────────────────────────────
function buildOrdenHTML(p, empresa = EMPTY_EMPRESA) {
  const saldo = parseFloat(p.precio || 0) - parseFloat(p.seña || 0);
  const now   = new Date();
  const fecha = now.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora  = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const num   = `OT-${String(p.id).padStart(4, "0")}`;
  const nombre = empresa.nombre || "Mafalda Gráfica";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Orden ${num} — ${nombre}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a2340}
  .page{width:210mm;min-height:148mm;margin:0 auto;padding:20mm 20mm 16mm}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:13px;border-bottom:3px solid #1a2e8a;margin-bottom:16px}
  .hdr-left{display:flex;align-items:center;gap:14px}
  .logo-img{width:60px;height:60px;object-fit:contain;border-radius:8px}
  .brand{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:#1a2e8a}
  .brand-data{font-size:11px;color:#6b7a9a;margin-top:3px;line-height:1.6}
  .onum{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#1a2e8a;text-align:right}
  .ofecha{font-size:11px;color:#8a93a8;text-align:right;margin-top:3px}
  .banner{background:#e3f2fd;color:#0d47a1;text-align:center;padding:7px 0;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px}
  .ped{background:#f0f3f9;border-radius:8px;padding:12px 15px;margin-bottom:14px}
  .ped-lbl{font-size:10px;font-weight:600;color:#8a93a8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
  .ped-nom{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#1a2340}
  .ped-cat{display:inline-block;margin-top:5px;font-size:12px;font-weight:600;color:#1a2e8a;background:#dde6ff;padding:3px 10px;border-radius:20px}
  .igrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:13px}
  .ibox{background:#f8faff;border-radius:7px;padding:9px 12px;border-left:3px solid #1a2e8a}
  .ilbl{font-size:10px;font-weight:600;color:#8a93a8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:3px}
  .ival{font-size:14px;font-weight:600;color:#1a2340}
  .notas{border:1.5px dashed #c5cce0;border-radius:7px;padding:10px 13px;margin-bottom:13px;min-height:44px}
  .ntit{font-size:10px;font-weight:600;color:#8a93a8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
  .ntxt{font-size:13px;color:#4a5568;line-height:1.5}
  .fgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:16px}
  .fbox{text-align:center;background:#f8faff;border-radius:7px;padding:9px 7px}
  .flbl{font-size:10px;font-weight:600;color:#8a93a8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}
  .fval{font-family:'Playfair Display',serif;font-size:17px;font-weight:700}
  .foot{border-top:1.5px solid #edf0f7;padding-top:11px;display:flex;justify-content:space-between;align-items:flex-end}
  .firma{text-align:center}
  .flin{width:160px;border-bottom:1.5px solid #8a93a8;margin-bottom:4px;height:26px}
  .flbl2{font-size:10px;color:#8a93a8;text-transform:uppercase;letter-spacing:.6px}
  .fnota{font-size:10px;color:#8a93a8;text-align:right;line-height:1.6}
  @media print{body{padding:0}.page{padding:12mm 14mm 10mm}}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div class="hdr-left">
      ${empresa.logo ? `<img class="logo-img" src="${empresa.logo}" alt="Logo"/>` : ""}
      <div>
        <div class="brand">${nombre}</div>
        <div class="brand-data">
          ${empresa.titular ? `<span>Titular: ${empresa.titular}</span><br/>` : ""}
          ${empresa.cuit ? `<span>CUIT: ${empresa.cuit}</span><br/>` : ""}
          ${empresa.direccion ? `<span>📍 ${empresa.direccion}</span><br/>` : ""}
          ${empresa.telefono ? `<span>📞 ${empresa.telefono}</span>` : ""}
        </div>
      </div>
    </div>
    <div>
      <div class="onum">${num}</div>
      <div class="ofecha">Emitida: ${fecha} — ${hora}</div>
    </div>
  </div>
  <div class="banner">⚙️ &nbsp; En Producción</div>
  <div class="ped">
    <div class="ped-lbl">Descripción del pedido</div>
    <div class="ped-nom">${p.nombre}</div>
    <span class="ped-cat">${CATEGORIA_ICON[p.categoria]} ${p.categoria}</span>
  </div>
  <div class="igrid">
    <div class="ibox"><div class="ilbl">🏢 Cliente</div><div class="ival">${p.cliente}</div></div>
    <div class="ibox"><div class="ilbl">📞 Teléfono</div><div class="ival">${p.telefono || "—"}</div></div>
    <div class="ibox"><div class="ilbl">📅 Fecha de Pedido</div><div class="ival">${p.fechaPedido || "—"}</div></div>
    <div class="ibox"><div class="ilbl">🏁 Fecha de Entrega</div><div class="ival" style="color:${p.fechaEntrega < new Date().toISOString().split('T')[0] ? '#c62828':'#1a2340'}">${p.fechaEntrega || "—"}</div></div>
  </div>
  <div class="notas">
    <div class="ntit">📝 Especificaciones / Notas</div>
    <div class="ntxt">${p.notas || "Sin notas adicionales."}</div>
  </div>
  <div class="fgrid">
    <div class="fbox"><div class="flbl">Precio Total</div><div class="fval" style="color:#1a2340">$${parseFloat(p.precio||0).toLocaleString("es-AR")}</div></div>
    <div class="fbox"><div class="flbl">Seña / Adelanto</div><div class="fval" style="color:#2e7d32">$${parseFloat(p.seña||0).toLocaleString("es-AR")}</div></div>
    <div class="fbox"><div class="flbl">Saldo a Cobrar</div><div class="fval" style="color:${saldo>0?'#c62828':'#2e7d32'}">$${saldo.toLocaleString("es-AR")}</div></div>
  </div>
  <div class="foot">
    <div class="firma"><div class="flin"></div><div class="flbl2">Firma operario</div></div>
    <div class="fnota">${nombre} · Sistema de Pedidos<br/>${num} · ${fecha}</div>
  </div>
</div>
<script>window.onload=()=>window.print();</script>
</body>
</html>`;
}

function imprimirOrden(p, empresa) {
  const html = buildOrdenHTML(p, empresa);
  const win  = window.open("", "_blank", "width:920,height:700");
  if (!win) { alert("Habilitá los popups del navegador para imprimir la orden."); return; }
  win.document.write(html);
  win.document.close();
}

// ── Componente: Kanban ────────────────────────────────────────────────────
function KanbanView({ pedidos, handleEstadoChange, handleEdit, handleDelete, setSelectedPedido, setView, CATEGORIA_COLOR, CATEGORIA_ICON, ESTADO_COLOR, isVencido, isHoy }) {
  const cols = ["Pendiente", "En Producción", "Listo"];
  const activePedidos = pedidos.filter(p => p.estado !== "Entregado");

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, alignItems:"start" }}>
      {cols.map(col => {
        const ec    = ESTADO_COLOR[col];
        const items = activePedidos.filter(p => p.estado === col)
          .sort((a,b) => (!a.fechaEntrega?1:!b.fechaEntrega?-1:a.fechaEntrega.localeCompare(b.fechaEntrega)));
        const colAccent = col==="Pendiente"?"#9e9e9e":col==="En Producción"?"#1976d2":"#f57f17";
        return (
          <div key={col}>
            {/* Col header */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, padding:"10px 14px", background:"#fff", borderRadius:10, boxShadow:"0 2px 8px rgba(26,46,138,.07)", borderTop:`3px solid ${colAccent}` }}>
              <span style={{ background:ec.bg, color:ec.text, padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>{col}</span>
              <span style={{ background:colAccent, color:"#fff", borderRadius:"50%", width:20, height:20, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, marginLeft:"auto" }}>{items.length}</span>
            </div>
            {/* Cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {items.length === 0 ? (
                <div style={{ border:"2px dashed #e0e5f0", borderRadius:10, padding:"24px 16px", textAlign:"center", color:"#c5cce0", fontSize:13 }}>Sin pedidos</div>
              ) : items.map(p => {
                const cc  = CATEGORIA_COLOR[p.categoria];
                const ven = isVencido(p);
                const hf  = isHoy(p);
                return (
                  <div key={p.id} onClick={() => { setSelectedPedido(p); setView("detalle"); }}
                    style={{ background:"#fff", borderRadius:10, padding:"14px 15px", boxShadow:"0 2px 10px rgba(26,46,138,.08)", cursor:"pointer", borderLeft:`3px solid ${cc.accent}`, transition:"transform .15s, box-shadow .15s", position:"relative" }}
                    onMouseOver={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 18px rgba(26,46,138,.13)"; }}
                    onMouseOut={e  => { e.currentTarget.style.transform="translateY(0)";   e.currentTarget.style.boxShadow="0 2px 10px rgba(26,46,138,.08)"; }}>
                    {/* Categoria badge */}
                    <span style={{ background:cc.bg, color:cc.text, fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, display:"inline-block", marginBottom:8 }}>
                      {CATEGORIA_ICON[p.categoria]} {p.categoria}
                    </span>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1a2340", marginBottom:4, lineHeight:1.3 }}>{p.nombre}</div>
                    <div style={{ fontSize:12, color:"#6b7a9a", marginBottom:8 }}>👤 {p.cliente}</div>
                    {/* Fecha entrega */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:11, fontWeight:600, color:ven?"#c62828":hf?"#f57f17":"#8a93a8", background:ven?"#ffebee":hf?"#fff8e1":"#f8faff", padding:"3px 8px", borderRadius:6 }}>
                        {ven?"⚠️ ":hf?"📍 ":"📅 "}{p.fechaEntrega||"S/F"}
                      </span>
                      {p.precio && (
                        <span style={{ fontSize:12, fontWeight:700, color:"#1a2340" }}>
                          ${parseFloat(p.precio).toLocaleString("es-AR")}
                        </span>
                      )}
                    </div>
                    {/* Actions */}
                    <div style={{ display:"flex", gap:5, marginTop:10, paddingTop:10, borderTop:"1px solid #f0f3f9" }} onClick={e => e.stopPropagation()}>
                      <select value={p.estado} onChange={e => handleEstadoChange(p.id, e.target.value)}
                        style={{ flex:1, padding:"4px 6px", borderRadius:6, fontSize:11, fontWeight:600, border:`1.5px solid ${cc.accent}22`, background:ec.bg, color:ec.text, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                        {["Pendiente","En Producción","Listo","Entregado"].map(s=><option key={s}>{s}</option>)}
                      </select>
                      <button style={{ background:"transparent", border:"1.5px solid #dde3ef", color:"#4a5568", padding:"4px 8px", borderRadius:6, fontSize:12, cursor:"pointer" }} onClick={() => handleEdit(p)}>✏️</button>
                      <button style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"4px 8px", borderRadius:6, fontSize:12, cursor:"pointer" }} onClick={() => handleDelete(p.id)}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Chip de pedido para calendario ───────────────────────────────────────
function PedidoChip({ p, ven, setSelectedPedido, setView, CATEGORIA_COLOR }) {
  const cc = CATEGORIA_COLOR[p.categoria];
  return (
    <div onClick={e => { e.stopPropagation(); setSelectedPedido(p); setView("detalle"); }}
      style={{ background:ven?"#ffebee":cc.bg, borderLeft:`2px solid ${ven?"#c62828":cc.accent}`, borderRadius:4, padding:"2px 5px", marginBottom:2, cursor:"pointer", fontSize:10, fontWeight:600, color:ven?"#c62828":cc.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
      title={`${p.nombre} — ${p.cliente}`}>
      {p.nombre}
    </div>
  );
}

// ── Componente: Calendario ────────────────────────────────────────────────
function CalendarioView({ pedidos, setSelectedPedido, setView, CATEGORIA_COLOR, CATEGORIA_ICON, ESTADO_COLOR, isVencido }) {
  const [modoCalendario, setModoCalendario] = useState("semana");
  const [fechaBase, setFechaBase]           = useState(new Date());

  const activePedidos = pedidos.filter(p => p.estado !== "Entregado" && p.fechaEntrega);

  const pedidosPorFecha = useMemo(() => {
    const map = {};
    activePedidos.forEach(p => {
      if (!map[p.fechaEntrega]) map[p.fechaEntrega] = [];
      map[p.fechaEntrega].push(p);
    });
    return map;
  }, [activePedidos]);

  const fmtFecha = (d) => d.toISOString().split("T")[0];
  const hoy      = fmtFecha(new Date());

  const moverFecha = (dir) => {
    const d = new Date(fechaBase);
    if (modoCalendario === "dia")    d.setDate(d.getDate() + dir);
    if (modoCalendario === "semana") d.setDate(d.getDate() + dir * 7);
    if (modoCalendario === "mes")    d.setMonth(d.getMonth() + dir);
    setFechaBase(d);
  };

  // Días a mostrar según modo
  const diasAMostrar = useMemo(() => {
    if (modoCalendario === "dia") {
      return [new Date(fechaBase)];
    }
    if (modoCalendario === "semana") {
      const lunes = new Date(fechaBase);
      lunes.setDate(lunes.getDate() - ((lunes.getDay()+6)%7));
      return Array.from({length:7}, (_,i) => { const d=new Date(lunes); d.setDate(d.getDate()+i); return d; });
    }
    // mes
    const año   = fechaBase.getFullYear();
    const mes   = fechaBase.getMonth();
    const first = new Date(año, mes, 1);
    const last  = new Date(año, mes+1, 0);
    const start = new Date(first); start.setDate(start.getDate() - ((start.getDay()+6)%7));
    const end   = new Date(last);  end.setDate(end.getDate() + (6-(end.getDay()+6)%7));
    const dias  = [];
    const cur   = new Date(start);
    while (cur <= end) { dias.push(new Date(cur)); cur.setDate(cur.getDate()+1); }
    return dias;
  }, [modoCalendario, fechaBase]);

  const tituloNavegacion = () => {
    if (modoCalendario === "dia") return fechaBase.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
    if (modoCalendario === "semana") {
      const lunes  = diasAMostrar[0];
      const dom    = diasAMostrar[6];
      return `${lunes.getDate()} ${lunes.toLocaleDateString("es-AR",{month:"short"})} — ${dom.getDate()} ${dom.toLocaleDateString("es-AR",{month:"short", year:"numeric"})}`;
    }
    return fechaBase.toLocaleDateString("es-AR", { month:"long", year:"numeric" });
  };

  const DIAS_SEMANA = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

  return (
    <div>
      {/* Controles */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:6 }}>
          {["dia","semana","mes"].map(m => (
            <button key={m} onClick={() => setModoCalendario(m)}
              style={{ padding:"7px 16px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif", transition:"all .18s",
                background:modoCalendario===m?"#1a2e8a":"#fff",
                color:modoCalendario===m?"#fff":"#4a5568",
                boxShadow:modoCalendario===m?"0 3px 10px rgba(26,46,138,.2)":"0 1px 6px rgba(26,46,138,.07)" }}>
              {m==="dia"?"Día":m==="semana"?"Semana":"Mes"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => moverFecha(-1)} style={{ background:"#fff", border:"1.5px solid #dde3ef", color:"#1a2340", width:34, height:34, borderRadius:8, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:16, color:"#1a2340", minWidth:220, textAlign:"center", textTransform:"capitalize" }}>{tituloNavegacion()}</span>
          <button onClick={() => moverFecha(1)}  style={{ background:"#fff", border:"1.5px solid #dde3ef", color:"#1a2340", width:34, height:34, borderRadius:8, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
          <button onClick={() => setFechaBase(new Date())} style={{ padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:600, border:"1.5px solid #1a2e8a", color:"#1a2e8a", background:"#fff", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Hoy</button>
        </div>
      </div>

      {/* Grilla */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(26,46,138,.07)", overflow:"hidden" }}>
        {/* Cabecera días de semana (solo mes/semana) */}
        {modoCalendario !== "dia" && (
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${modoCalendario==="semana"?7:7}, 1fr)`, borderBottom:"2px solid #edf0f7" }}>
            {DIAS_SEMANA.map(d => (
              <div key={d} style={{ padding:"10px 8px", textAlign:"center", fontSize:11, fontWeight:700, color:"#8a93a8", textTransform:"uppercase", letterSpacing:".7px" }}>{d}</div>
            ))}
          </div>
        )}

        {/* Modo día */}
        {modoCalendario === "dia" && (() => {
          const fecha = fmtFecha(diasAMostrar[0]);
          const ps    = pedidosPorFecha[fecha] || [];
          const esHoy = fecha === hoy;
          return (
            <div style={{ padding:"24px 28px" }}>
              <div style={{ marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:esHoy?"#1a2e8a":"#1a2340" }}>
                  {diasAMostrar[0].toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}
                </div>
                {esHoy && <span style={{ background:"#1a2e8a", color:"#fff", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>Hoy</span>}
                <span style={{ background:"#f0f3f9", color:"#4a5568", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{ps.length} pedido{ps.length!==1?"s":""}</span>
              </div>
              {ps.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#c5cce0", fontSize:14 }}>Sin pedidos para este día</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {ps.map(p => {
                    const cc = CATEGORIA_COLOR[p.categoria];
                    const ec = ESTADO_COLOR[p.estado];
                    return (
                      <div key={p.id} onClick={() => { setSelectedPedido(p); setView("detalle"); }}
                        style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderRadius:10, border:`1.5px solid ${cc.accent}22`, background:cc.bg+"44", cursor:"pointer", transition:"box-shadow .15s" }}
                        onMouseOver={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(26,46,138,.12)"}
                        onMouseOut={e=>e.currentTarget.style.boxShadow="none"}>
                        <span style={{ fontSize:22 }}>{CATEGORIA_ICON[p.categoria]}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, color:"#1a2340", fontSize:14 }}>{p.nombre}</div>
                          <div style={{ fontSize:12, color:"#6b7a9a" }}>👤 {p.cliente} {p.telefono&&`· ${p.telefono}`}</div>
                        </div>
                        <span style={{ background:ec.bg, color:ec.text, padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{p.estado}</span>
                        {p.precio && <span style={{ fontWeight:700, fontSize:13, color:"#1a2340" }}>${parseFloat(p.precio).toLocaleString("es-AR")}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Modo semana / mes */}
        {modoCalendario !== "dia" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {diasAMostrar.map((d, i) => {
              const fecha   = fmtFecha(d);
              const ps      = pedidosPorFecha[fecha] || [];
              const esHoy   = fecha === hoy;
              const esMes   = d.getMonth() === fechaBase.getMonth();
              const domingo = (d.getDay() === 0);
              return (
                <div key={i} style={{
                  minHeight: modoCalendario==="mes" ? 110 : 160,
                  padding:"8px 8px 6px",
                  borderRight: i%7!==6 ? "1px solid #f0f3f9" : "none",
                  borderBottom:"1px solid #f0f3f9",
                  background: esHoy ? "#eef2ff" : !esMes ? "#fafafa" : "#fff",
                  opacity: !esMes ? .6 : 1,
                }}>
                  <div style={{ marginBottom:5, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, fontWeight:700, width:24, height:24, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:"50%",
                      background:esHoy?"#1a2e8a":"transparent", color:esHoy?"#fff":domingo?"#c62828":"#4a5568" }}>
                      {d.getDate()}
                    </span>
                    {ps.length > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#1a2e8a", background:"#dde6ff", borderRadius:10, padding:"1px 5px" }}>{ps.length}</span>}
                  </div>
                  <div>
                    {(modoCalendario==="mes" ? ps.slice(0,2) : ps).map(p => <PedidoChip key={p.id} p={p} cc={CATEGORIA_COLOR[p.categoria]} ven={isVencido(p)} setSelectedPedido={setSelectedPedido} setView={setView} CATEGORIA_COLOR={CATEGORIA_COLOR} />)}
                    {modoCalendario==="mes" && ps.length > 2 && (
                      <div style={{ fontSize:10, color:"#8a93a8", fontWeight:600, paddingLeft:4 }}>+{ps.length-2} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div style={{ marginTop:14, display:"flex", gap:16, flexWrap:"wrap", fontSize:12, color:"#8a93a8", alignItems:"center" }}>
        <span>Leyenda:</span>
        <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:"#eef2ff", border:"1.5px solid #1a2e8a", display:"inline-block" }}></span> Hoy</span>
        <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:"#ffebee", border:"1.5px solid #c62828", display:"inline-block" }}></span> Vencido</span>
        <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:"#fafafa", border:"1.5px solid #dde3ef", display:"inline-block" }}></span> Fuera del mes</span>
      </div>
    </div>
  );
}


function PedidosListos({ pedidos, saldo, isHoy, handleEstadoChange, handleDelete, setMsgModal, CATEGORIA_COLOR, CATEGORIA_ICON, inp }) {
  const [busqL, setBusqL] = useState("");
  const listos = pedidos
    .filter(p => p.estado === "Listo")
    .sort((a,b) => (!a.fechaEntrega?1:!b.fechaEntrega?-1:a.fechaEntrega.localeCompare(b.fechaEntrega)));
  const filtrados = listos.filter(p => {
    const q = busqL.toLowerCase();
    return !busqL || p.nombre.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q);
  });
  const totalCobrar = listos.reduce((s,p) => s + saldo(p), 0);
  const entregados  = pedidos.filter(p=>p.estado==="Entregado").sort((a,b)=>b.fechaEntrega?.localeCompare(a.fechaEntrega||"")||0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#1a2340" }}>✅ Pedidos Listos para Entregar</h2>
          <p style={{ fontSize:14, color:"#8a93a8", marginTop:4 }}>Pedidos finalizados que esperan ser retirados o entregados</p>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(26,46,138,.07)", padding:"12px 20px", textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#8a93a8", textTransform:"uppercase", letterSpacing:".6px", marginBottom:4 }}>Pedidos listos</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#f57f17" }}>{listos.length}</div>
          </div>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(26,46,138,.07)", padding:"12px 20px", textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#8a93a8", textTransform:"uppercase", letterSpacing:".6px", marginBottom:4 }}>Por cobrar</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:"#c62828" }}>${totalCobrar.toLocaleString("es-AR")}</div>
          </div>
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(26,46,138,.07)", padding:"14px 18px", marginBottom:18 }}>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>🔍</span>
          <input placeholder="Buscar por pedido o cliente..." value={busqL} onChange={e => setBusqL(e.target.value)}
            style={{ ...inp(), paddingLeft:34, width:"100%" }}/>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(26,46,138,.07)", padding:"52px 24px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:14 }}>🎉</div>
          <div style={{ fontWeight:700, fontSize:18, fontFamily:"'Playfair Display',serif", marginBottom:6 }}>
            {listos.length === 0 ? "No hay pedidos listos aún" : "Sin resultados"}
          </div>
          <div style={{ color:"#8a93a8", fontSize:14 }}>
            {listos.length === 0 ? "Cuando un pedido pase a 'Listo' aparecerá aquí" : "Probá con otro término"}
          </div>
        </div>
      ) : (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(26,46,138,.07)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            <thead>
              <tr style={{ background:"#f8faff" }}>
                {["Pedido","Categoría","Cliente","Fecha Entrega","Total","Saldo","Acciones"].map(h => (
                  <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontWeight:600, fontSize:11, color:"#6b7a9a", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap", borderBottom:"1px solid #edf0f7" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const cc = CATEGORIA_COLOR[p.categoria];
                const hf = isHoy(p);
                return (
                  <tr key={p.id} style={{ borderBottom:"1px solid #f2f4f9", background:hf?"#fffdf0":"#fff" }}>
                    <td style={{ padding:"13px 16px" }}>
                      <div style={{ fontWeight:600, color:"#1a2340" }}>{p.nombre}</div>
                      {p.notas && <div style={{ fontSize:11, color:"#8a93a8", marginTop:2, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.notas}</div>}
                    </td>
                    <td style={{ padding:"13px 16px" }}>
                      <span style={{ background:cc.bg, color:cc.text, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{CATEGORIA_ICON[p.categoria]} {p.categoria}</span>
                    </td>
                    <td style={{ padding:"13px 16px", color:"#4a5568", whiteSpace:"nowrap" }}>
                      <div style={{ fontWeight:600 }}>{p.cliente}</div>
                      {p.telefono && <div style={{ fontSize:11, color:"#8a93a8" }}>{p.telefono}</div>}
                    </td>
                    <td style={{ padding:"13px 16px", whiteSpace:"nowrap" }}>
                      <span style={{ fontWeight:600, color:hf?"#f57f17":"#1a2340" }}>{hf&&"📍 "}{p.fechaEntrega||"—"}</span>
                      {hf && <div style={{ fontSize:11, color:"#f57f17" }}>Hoy</div>}
                    </td>
                    <td style={{ padding:"13px 16px", fontWeight:600, color:"#1a2340", whiteSpace:"nowrap" }}>{p.precio?`$${parseFloat(p.precio).toLocaleString("es-AR")}`:"—"}</td>
                    <td style={{ padding:"13px 16px", whiteSpace:"nowrap" }}>
                      <span style={{ fontWeight:700, color:saldo(p)>0?"#c62828":"#2e7d32", fontSize:14 }}>{p.precio?`$${saldo(p).toLocaleString("es-AR")}`:"—"}</span>
                    </td>
                    <td style={{ padding:"13px 16px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button style={{ background:"#25d366", color:"#fff", border:"none", padding:"6px 12px", borderRadius:7, fontSize:13, fontWeight:700, cursor:"pointer" }} onClick={() => setMsgModal({ pedido: p })}>💬</button>
                        <button style={{ background:"#1a2e8a", color:"#fff", border:"none", padding:"6px 12px", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }} onClick={() => handleEstadoChange(p.id, "Entregado")}>📦 Entregar</button>
                        <button style={{ background:"#ef5350", color:"#fff", border:"none", padding:"7px 12px", borderRadius:7, fontSize:13, fontWeight:600, cursor:"pointer" }} onClick={() => handleDelete(p.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {entregados.length > 0 && (
        <div style={{ marginTop:32 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"#4a5568", marginBottom:14 }}>
            📦 Historial de Entregados ({entregados.length})
          </h3>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(26,46,138,.07)", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
              <thead>
                <tr style={{ background:"#f8faff" }}>
                  {["Pedido","Categoría","Cliente","Fecha Entrega","Total","Estado"].map(h => (
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontWeight:600, fontSize:11, color:"#6b7a9a", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap", borderBottom:"1px solid #edf0f7" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entregados.map(p => {
                  const cc = CATEGORIA_COLOR[p.categoria];
                  return (
                    <tr key={p.id} style={{ borderBottom:"1px solid #f2f4f9", opacity:.85 }}>
                      <td style={{ padding:"11px 16px", fontWeight:600, color:"#4a5568" }}>{p.nombre}</td>
                      <td style={{ padding:"11px 16px" }}>
                        <span style={{ background:cc.bg, color:cc.text, padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>{CATEGORIA_ICON[p.categoria]} {p.categoria}</span>
                      </td>
                      <td style={{ padding:"11px 16px", color:"#4a5568", whiteSpace:"nowrap" }}>{p.cliente}</td>
                      <td style={{ padding:"11px 16px", color:"#4a5568", whiteSpace:"nowrap" }}>{p.fechaEntrega||"—"}</td>
                      <td style={{ padding:"11px 16px", fontWeight:600, color:"#4a5568", whiteSpace:"nowrap" }}>{p.precio?`$${parseFloat(p.precio).toLocaleString("es-AR")}`:"—"}</td>
                      <td style={{ padding:"11px 16px" }}>
                        <span style={{ background:"#e8f5e9", color:"#1b5e20", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>✅ Entregado</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente: Configuración ─────────────────────────────────────────────
function ConfigView({ empresa, setEmpresa, empresaSaved, setEmpresaSaved }) {
  const [form, setForm]       = useState({ ...empresa });
  const [preview, setPreview] = useState(empresa.logo || "");

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPreview(ev.target.result); setForm(f => ({ ...f, logo: ev.target.result })); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    await setDoc(doc(db, "config", "empresa"), form);
    setEmpresa(form);
    setEmpresaSaved(true);
    setTimeout(() => setEmpresaSaved(false), 2500);
  };

  const field = (label, key, placeholder) => (
    <div>
      <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>{label}</label>
      <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={placeholder}
        style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #dde3ef", fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"#1a2340", outline:"none", boxSizing:"border-box" }}/>
    </div>
  );

  return (
    <div style={{ maxWidth:760, margin:"0 auto" }}>
      <div style={{ marginBottom:26 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#1a2340", marginBottom:4 }}>⚙️ Configuración del Local</h2>
        <p style={{ fontSize:14, color:"#8a93a8" }}>Estos datos aparecerán en todas las órdenes de trabajo que imprimas.</p>
      </div>

      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(26,46,138,.07)", padding:"32px 36px" }}>
        {/* Logo */}
        <div style={{ marginBottom:28 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:10 }}>Logo del local</label>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ width:90, height:90, borderRadius:14, border:"2px dashed #c5cce0", background:"#f8faff", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
              {preview ? <img src={preview} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }}/> : <span style={{ fontSize:32, opacity:.4 }}>🖼️</span>}
            </div>
            <div>
              <label style={{ display:"inline-block", background:"#1a2e8a", color:"#fff", padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                📁 Subir imagen
                <input type="file" accept="image/*" onChange={handleLogo} style={{ display:"none" }}/>
              </label>
              {preview && (
                <button onClick={() => { setPreview(""); setForm(f=>({...f,logo:""})); }}
                  style={{ marginLeft:10, background:"transparent", border:"1.5px solid #ef5350", color:"#ef5350", padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  ✕ Quitar
                </button>
              )}
              <p style={{ fontSize:12, color:"#8a93a8", marginTop:8 }}>PNG, JPG o SVG. Recomendado: fondo transparente.</p>
            </div>
          </div>
        </div>

        <div style={{ borderTop:"1px solid #edf0f7", paddingTop:24, display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
          <div style={{ gridColumn:"1 / -1" }}>{field("Nombre del local / empresa", "nombre", "Ej: Mafalda Gráfica")}</div>
          {field("Titular / Responsable", "titular", "Nombre y apellido")}
          {field("CUIT", "cuit", "XX-XXXXXXXX-X")}
          {field("Dirección", "direccion", "Calle, número, ciudad")}
          {field("Teléfono / WhatsApp", "telefono", "11-xxxx-xxxx")}
        </div>

        {/* Preview */}
        <div style={{ marginTop:28, background:"#f0f3f9", borderRadius:12, padding:"18px 20px" }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#8a93a8", textTransform:"uppercase", letterSpacing:".7px", marginBottom:12 }}>👁️ Vista previa del encabezado de la orden</div>
          <div style={{ background:"#fff", borderRadius:10, padding:"16px 20px", borderBottom:"3px solid #1a2e8a", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {preview && <img src={preview} alt="Logo" style={{ width:50, height:50, objectFit:"contain", borderRadius:7 }}/>}
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"#1a2e8a" }}>{form.nombre||"Nombre del local"}</div>
                <div style={{ fontSize:11, color:"#6b7a9a", marginTop:3, lineHeight:1.7 }}>
                  {form.titular   && <div>Titular: {form.titular}</div>}
                  {form.cuit      && <div>CUIT: {form.cuit}</div>}
                  {form.direccion && <div>📍 {form.direccion}</div>}
                  {form.telefono  && <div>📞 {form.telefono}</div>}
                </div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"#1a2e8a" }}>OT-0001</div>
              <div style={{ fontSize:11, color:"#8a93a8", marginTop:2 }}>Emitida: hoy</div>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:24 }}>
          <button style={{ background:"#1a2e8a", color:"#fff", border:"none", padding:"11px 28px", borderRadius:8, fontSize:15, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:8 }} onClick={handleSave}>
            {empresaSaved ? "✅ ¡Guardado!" : "💾 Guardar configuración"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [pedidos, setPedidos]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [view, setView]                   = useState("lista");
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [formData, setFormData]           = useState(EMPTY_FORM);
  const [editingId, setEditingId]         = useState(null);
  const [busqueda, setBusqueda]           = useState("");
  const [filtroEstado, setFiltroEstado]   = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [toast, setToast]                 = useState(null);
  const [errors, setErrors]               = useState({});
  const [expandedCats, setExpandedCats]   = useState({});
  const [printModal, setPrintModal]       = useState(null);
  const [msgModal, setMsgModal]           = useState(null);
  const [copied, setCopied]               = useState(false);
  const [empresa, setEmpresa]             = useState(EMPTY_EMPRESA);
  const [empresaSaved, setEmpresaSaved]   = useState(false);
  const [vistaLista, setVistaLista]       = useState("categorias");

  // ── Firebase: escuchar pedidos en tiempo real ──
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pedidos"), (snap) => {
      const data = snap.docs.map(d => ({ ...d.data(), fireId: d.id }));
      data.sort((a,b) => (a.id||0) - (b.id||0));
      setPedidos(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Firebase: cargar configuración de empresa ──
  useEffect(() => {
    getDoc(doc(db, "config", "empresa")).then(snap => {
      if (snap.exists()) setEmpresa(snap.data());
    });
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const filtered = useMemo(() => pedidos.filter(p => {
    if (p.estado === "Listo") return false; // van a la página de Listos
    const q = busqueda.toLowerCase();
    return (!busqueda || p.nombre.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || p.telefono?.includes(busqueda))
      && (filtroEstado    === "Todos"  || p.estado    === filtroEstado)
      && (filtroCategoria === "Todas"  || p.categoria === filtroCategoria);
  }), [pedidos, busqueda, filtroEstado, filtroCategoria]);

  const grouped = useMemo(() => {
    const g = {};
    CATEGORIAS.forEach(cat => {
      const items = filtered.filter(p => p.categoria === cat)
        .sort((a, b) => (!a.fechaEntrega ? 1 : !b.fechaEntrega ? -1 : a.fechaEntrega.localeCompare(b.fechaEntrega)));
      if (items.length) g[cat] = items;
    });
    return g;
  }, [filtered]);

  const stats = useMemo(() => ({
    total:     pedidos.filter(p => p.estado !== "Entregado" && p.estado !== "Listo").length,
    pendiente: pedidos.filter(p => p.estado === "Pendiente").length,
    produccion:pedidos.filter(p => p.estado === "En Producción").length,
    listo:     pedidos.filter(p => p.estado === "Listo").length,
    porCobrar: pedidos.filter(p => p.estado !== "Entregado")
                 .reduce((s, p) => s + parseFloat(p.precio||0) - parseFloat(p.seña||0), 0),
  }), [pedidos]);

  const validate = () => {
    const e = {};
    if (!formData.nombre.trim())  e.nombre       = "El nombre es obligatorio";
    if (!formData.cliente.trim()) e.cliente      = "El cliente es obligatorio";
    if (!formData.fechaEntrega)   e.fechaEntrega = "La fecha de entrega es obligatoria";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const triggerPrintIfNeeded = (prev, next) => {
    if (prev?.estado !== "En Producción" && next.estado === "En Producción")
      setTimeout(() => setPrintModal({ pedido: next }), 350);
  };

  const triggerMsgIfNeeded = (prev, next) => {
    if (prev?.estado !== "Listo" && next.estado === "Listo")
      setTimeout(() => setMsgModal({ pedido: next }), 350);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (editingId !== null) {
      const prev    = pedidos.find(p => p.id === editingId);
      const updated = { ...formData, id: editingId };
      const fireId  = prev.fireId;
      await updateDoc(doc(db, "pedidos", fireId), updated);
      showToast("Pedido actualizado correctamente");
      triggerPrintIfNeeded(prev, updated);
      triggerMsgIfNeeded(prev, updated);
    } else {
      const newId = Math.max(...pedidos.map(p => p.id), 0) + 1;
      const nuevo = { ...formData, id: newId };
      await addDoc(collection(db, "pedidos"), nuevo);
      showToast("Pedido cargado exitosamente 🎉");
      triggerPrintIfNeeded(null, nuevo);
      triggerMsgIfNeeded(null, nuevo);
    }
    setFormData(EMPTY_FORM); setEditingId(null); setErrors({}); setView("lista");
  };

  const handleEstadoChange = async (id, nuevoEstado) => {
    const prev    = pedidos.find(p => p.id === id);
    const updated = { ...prev, estado: nuevoEstado };
    await updateDoc(doc(db, "pedidos", prev.fireId), { estado: nuevoEstado });
    triggerPrintIfNeeded(prev, updated);
    triggerMsgIfNeeded(prev, updated);
  };

  const handleEdit   = (p) => { setFormData({...p}); setEditingId(p.id); setErrors({}); setView("formulario"); };
  const handleDelete = async (id) => {
    const p = pedidos.find(x => x.id === id);
    if (p?.fireId) await deleteDoc(doc(db, "pedidos", p.fireId));
    if (selectedPedido?.id === id) { setSelectedPedido(null); setView("lista"); }
    showToast("Pedido eliminado", "error");
  };

  const toggleCat     = (cat) => setExpandedCats(p => ({ ...p, [cat]: !p[cat] }));
  const isCatExpanded = (cat) => expandedCats[cat] !== false;
  const saldo         = (p)   => parseFloat(p.precio||0) - parseFloat(p.seña||0);
  const hoy           = new Date().toISOString().split("T")[0];
  const isVencido     = (p)   => p.fechaEntrega && p.fechaEntrega < hoy && p.estado !== "Entregado";
  const isHoy         = (p)   => p.fechaEntrega === hoy && p.estado !== "Entregado";

  const inp = (field) => ({
    width:"100%", padding:"10px 14px", borderRadius:8,
    border:`1.5px solid ${errors[field]?"#ef5350":"#dde3ef"}`,
    fontSize:14, fontFamily:"'DM Sans',sans-serif", background:"#fff",
    color:"#1a2340", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s"
  });

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#f0f3f9", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:"#1a2e8a", marginBottom:12 }}>Mafalda Gráfica</div>
      <div style={{ fontSize:14, color:"#8a93a8" }}>Cargando pedidos...</div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#f0f3f9", color:"#1a2340" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input:focus,select:focus,textarea:focus{border-color:#1a2e8a!important;box-shadow:0 0 0 3px rgba(26,46,138,.1)}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#c5cce0;border-radius:3px}
        .btn-p{background:#1a2e8a;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .18s}
        .btn-p:hover{background:#111f6b;transform:translateY(-1px);box-shadow:0 4px 14px rgba(26,46,138,.25)}
        .btn-g{background:transparent;color:#1a2e8a;border:1.5px solid #1a2e8a;padding:9px 20px;border-radius:8px;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .18s}
        .btn-g:hover{background:#eef1fa}
        .btn-d{background:#ef5350;color:#fff;border:none;padding:7px 12px;border-radius:7px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer}
        .btn-d:hover{background:#c62828}
        .btn-imp{background:#1a2e8a;color:#fff;border:none;padding:7px 13px;border-radius:7px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .18s}
        .btn-imp:hover{background:#111f6b;box-shadow:0 3px 10px rgba(26,46,138,.3)}
        .card{background:#fff;border-radius:14px;box-shadow:0 2px 14px rgba(26,46,138,.07)}
        .nav-lnk{padding:8px 18px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;transition:all .18s;color:rgba(255,255,255,.75)}
        .nav-lnk:hover{background:rgba(255,255,255,.15);color:#fff}
        .nav-lnk.act{background:rgba(255,255,255,.2);color:#fff;font-weight:700}
        .row-h:hover{background:#f5f7fd!important;cursor:pointer}
        .cat-tog:hover{background:#f0f3f9}
        .est-sel{padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;border:1.5px solid #dde3ef;cursor:pointer;background:#fff}
        .modal-ov{position:fixed;inset:0;background:rgba(17,31,107,.45);z-index:600;display:flex;align-items:center;justify-content:center;animation:fIn .2s ease}
        .modal-bx{background:#fff;border-radius:16px;padding:36px 32px;max-width:430px;width:90%;box-shadow:0 20px 60px rgba(17,31,107,.25);animation:pIn .25s ease;text-align:center}
        .msg-bx{background:#fff;border-radius:16px;padding:36px 32px;max-width:500px;width:92%;box-shadow:0 20px 60px rgba(17,31,107,.25);animation:pIn .25s ease}
        .msg-textarea{width:100%;border:2px solid #dde3ef;border-radius:10px;padding:14px 16px;font-size:15px;font-family:'DM Sans',sans-serif;color:#1a2340;line-height:1.6;resize:none;outline:none;transition:border-color .2s;background:#f8faff}
        .msg-textarea:focus{border-color:#1a2e8a;background:#fff}
        .btn-copy{background:#25d366;color:#fff;border:none;padding:11px 24px;border-radius:9px;font-size:15px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .18s}
        .btn-copy:hover{background:#1da851;box-shadow:0 3px 12px rgba(37,211,102,.35)}
        .btn-copy.copied{background:#2e7d32}
        @keyframes fIn{from{opacity:0}to{opacity:1}}
        @keyframes pIn{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#111f6b 0%,#1a2e8a 55%,#2540b8 100%)", boxShadow:"0 4px 20px rgba(17,31,107,.35)" }}>
        <div style={{ maxWidth:1220, margin:"0 auto", padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:70 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:42, height:42, background:"rgba(255,255,255,.13)", borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🖨️</div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:21, fontWeight:700, color:"#fff", lineHeight:1.1 }}>Mafalda Gráfica</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.55)", letterSpacing:"1px", textTransform:"uppercase" }}>Sistema de Pedidos</div>
            </div>
          </div>
          <nav style={{ display:"flex", gap:4 }}>
            <div className={`nav-lnk ${view==="lista"?"act":""}`} onClick={() => setView("lista")}>📋 Pedidos</div>
            <div className={`nav-lnk ${view==="listos"?"act":""}`} onClick={() => setView("listos")} style={{ position:"relative" }}>
              ✅ Pedidos Listos
              {pedidos.filter(p=>p.estado==="Listo").length > 0 && (
                <span style={{ position:"absolute", top:2, right:4, background:"#f57f17", color:"#fff", borderRadius:"50%", width:17, height:17, fontSize:10, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                  {pedidos.filter(p=>p.estado==="Listo").length}
                </span>
              )}
            </div>
            <div className={`nav-lnk ${view==="formulario"&&!editingId?"act":""}`}
              onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setErrors({}); setView("formulario"); }}>
              + Nuevo Pedido
            </div>
            <div className={`nav-lnk ${view==="config"?"act":""}`} onClick={() => setView("config")}>⚙️ Configuración</div>
          </nav>
        </div>
      </div>

      <div style={{ maxWidth:1220, margin:"0 auto", padding:"26px 28px" }}>

        {/* STATS */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:26 }}>
          {[
            { label:"Activos",            value:stats.total,      icon:"📁", color:"#1a2e8a" },
            { label:"Pendientes",         value:stats.pendiente,  icon:"⏳", color:"#616161" },
            { label:"En Producción",      value:stats.produccion, icon:"⚙️", color:"#0d47a1" },
            { label:"Listos p/ entregar", value:stats.listo,      icon:"✅", color:"#f57f17" },
            { label:"Por Cobrar",         value:`$${stats.porCobrar.toLocaleString("es-AR")}`, icon:"💰", color:"#1b5e20" },
          ].map((s,i) => (
            <div key={i} className="card" style={{ padding:"16px 18px" }}>
              <div style={{ fontSize:10, fontWeight:600, color:"#8a93a8", textTransform:"uppercase", letterSpacing:".7px", marginBottom:7 }}>{s.label}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:22, opacity:.75 }}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── LISTA ── */}
        {view==="lista" && (
          <div>
            {/* Selector de vista */}
            <div style={{ display:"flex", gap:8, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
              {[
                { id:"categorias", label:"📋 Por Categoría" },
                { id:"kanban",     label:"🗂 Kanban" },
                { id:"calendario", label:"📅 Calendario" },
              ].map(v => (
                <button key={v.id} onClick={() => setVistaLista(v.id)}
                  style={{ padding:"8px 18px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", border:"none", transition:"all .18s",
                    background: vistaLista===v.id ? "#1a2e8a" : "#fff",
                    color:      vistaLista===v.id ? "#fff"    : "#4a5568",
                    boxShadow:  vistaLista===v.id ? "0 3px 12px rgba(26,46,138,.25)" : "0 2px 8px rgba(26,46,138,.07)" }}>
                  {v.label}
                </button>
              ))}
            </div>

            {/* Filtros — solo en vista categorías */}
            {vistaLista === "categorias" && (
              <div className="card" style={{ padding:"16px 20px", marginBottom:20, display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
                <div style={{ position:"relative", flex:"1 1 220px" }}>
                  <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>🔍</span>
                  <input placeholder="Buscar por pedido, cliente o teléfono..." value={busqueda}
                    onChange={e => setBusqueda(e.target.value)} style={{ ...inp(), paddingLeft:34, width:"100%" }}/>
                </div>
                <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ ...inp(), width:180, cursor:"pointer" }}>
                  <option value="Todas">Todas las categorías</option>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...inp(), width:160, cursor:"pointer" }}>
                  {ESTADOS.filter(e => e !== "Listo").map(e => <option key={e}>{e}</option>)}
                </select>
                {(busqueda||filtroEstado!=="Todos"||filtroCategoria!=="Todas") && (
                  <button className="btn-g" style={{ padding:"9px 14px", fontSize:13 }}
                    onClick={() => { setBusqueda(""); setFiltroEstado("Todos"); setFiltroCategoria("Todas"); }}>✕ Limpiar</button>
                )}
                <div style={{ marginLeft:"auto", fontSize:13, color:"#8a93a8" }}>{filtered.length} pedido{filtered.length!==1?"s":""}</div>
              </div>
            )}

            {/* Vista: Categorías */}
            {vistaLista === "categorias" && (
              !Object.keys(grouped).length ? (
                <div className="card" style={{ padding:"52px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:14 }}>📭</div>
                  <div style={{ fontWeight:700, fontSize:18, fontFamily:"'Playfair Display',serif", marginBottom:6 }}>Sin pedidos</div>
                  <div style={{ color:"#8a93a8", fontSize:14 }}>Cargá un nuevo pedido con el botón de arriba</div>
                </div>
              ) : Object.entries(grouped).map(([cat, items]) => {
                const cc  = CATEGORIA_COLOR[cat];
                const exp = isCatExpanded(cat);
                return (
                  <div key={cat} className="card" style={{ marginBottom:16, overflow:"hidden" }}>
                    <div className="cat-tog" onClick={() => toggleCat(cat)}
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:exp?`2px solid ${cc.accent}22`:"none", cursor:"pointer", borderLeft:`4px solid ${cc.accent}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ background:cc.bg, color:cc.text, padding:"5px 12px", borderRadius:20, fontSize:13, fontWeight:700, display:"inline-flex", alignItems:"center", gap:6 }}>
                          {CATEGORIA_ICON[cat]} {cat}
                        </span>
                        <span style={{ background:cc.accent, color:"#fff", borderRadius:"50%", width:22, height:22, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>{items.length}</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <span style={{ fontSize:12, color:"#8a93a8" }}>📅 Próx. entrega: <strong style={{ color:"#1a2340" }}>{items[0]?.fechaEntrega||"—"}</strong></span>
                        <span style={{ fontSize:16, color:"#8a93a8", display:"inline-block", transform:exp?"rotate(0)":"rotate(-90deg)", transition:"transform .2s" }}>▾</span>
                      </div>
                    </div>
                    {exp && (
                      <div style={{ overflowX:"auto" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
                          <thead>
                            <tr style={{ background:"#f8faff" }}>
                              {["Pedido","Cliente","Estado","Fecha Entrega","Total","Saldo",""].map(h => (
                                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontWeight:600, fontSize:11, color:"#6b7a9a", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap", borderBottom:"1px solid #edf0f7" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(p => {
                              const ec  = ESTADO_COLOR[p.estado];
                              const ven = isVencido(p);
                              const hf  = isHoy(p);
                              return (
                                <tr key={p.id} className="row-h"
                                  style={{ borderBottom:"1px solid #f2f4f9", background:ven?"#fff8f8":hf?"#fffdf0":"#fff" }}
                                  onClick={() => { setSelectedPedido(p); setView("detalle"); }}>
                                  <td style={{ padding:"12px 16px" }}>
                                    <div style={{ fontWeight:600, color:"#1a2340" }}>{p.nombre}</div>
                                    {p.notas && <div style={{ fontSize:11, color:"#8a93a8", marginTop:2, maxWidth:210, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.notas}</div>}
                                  </td>
                                  <td style={{ padding:"12px 16px", color:"#4a5568", whiteSpace:"nowrap" }}>
                                    <div>{p.cliente}</div>
                                    {p.telefono && <div style={{ fontSize:11, color:"#8a93a8" }}>{p.telefono}</div>}
                                  </td>
                                  <td style={{ padding:"12px 16px" }} onClick={e => e.stopPropagation()}>
                                    <select className="est-sel" value={p.estado}
                                      onChange={e => handleEstadoChange(p.id, e.target.value)}
                                      style={{ background:ec.bg, color:ec.text, borderColor:ec.bg }}>
                                      {ESTADOS.filter(s => s!=="Todos").map(s => <option key={s}>{s}</option>)}
                                    </select>
                                  </td>
                                  <td style={{ padding:"12px 16px", whiteSpace:"nowrap" }}>
                                    <span style={{ fontWeight:600, color:ven?"#c62828":hf?"#f57f17":"#1a2340" }}>
                                      {ven&&"⚠️ "}{hf&&"📍 "}{p.fechaEntrega||"—"}
                                    </span>
                                    {ven && <div style={{ fontSize:11, color:"#c62828" }}>Vencido</div>}
                                    {hf  && <div style={{ fontSize:11, color:"#f57f17" }}>Hoy</div>}
                                  </td>
                                  <td style={{ padding:"12px 16px", fontWeight:600, color:"#1a2340", whiteSpace:"nowrap" }}>
                                    {p.precio?`$${parseFloat(p.precio).toLocaleString("es-AR")}`:"—"}
                                  </td>
                                  <td style={{ padding:"12px 16px", whiteSpace:"nowrap" }}>
                                    <span style={{ fontWeight:700, color:saldo(p)>0?"#c62828":"#2e7d32" }}>
                                      {p.precio?`$${saldo(p).toLocaleString("es-AR")}`:"—"}
                                    </span>
                                  </td>
                                  <td style={{ padding:"12px 14px" }} onClick={e => e.stopPropagation()}>
                                    <div style={{ display:"flex", gap:5 }}>
                                      <button className="btn-imp" title="Imprimir orden" onClick={() => imprimirOrden(p, empresa)}>🖨️</button>
                                      <button className="btn-g" style={{ padding:"5px 10px", fontSize:12 }} onClick={() => handleEdit(p)}>✏️</button>
                                      <button className="btn-d" onClick={() => handleDelete(p.id)}>🗑</button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Vista: Kanban */}
            {vistaLista === "kanban" && (
              <KanbanView
                pedidos={pedidos}
                handleEstadoChange={handleEstadoChange}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                setSelectedPedido={setSelectedPedido}
                setView={setView}
                CATEGORIA_COLOR={CATEGORIA_COLOR}
                CATEGORIA_ICON={CATEGORIA_ICON}
                ESTADO_COLOR={ESTADO_COLOR}
                isVencido={isVencido}
                isHoy={isHoy}
              />
            )}

            {/* Vista: Calendario */}
            {vistaLista === "calendario" && (
              <CalendarioView
                pedidos={pedidos}
                setSelectedPedido={setSelectedPedido}
                setView={setView}
                CATEGORIA_COLOR={CATEGORIA_COLOR}
                CATEGORIA_ICON={CATEGORIA_ICON}
                ESTADO_COLOR={ESTADO_COLOR}
                isVencido={isVencido}
              />
            )}
          </div>
        )}

        {/* ── FORMULARIO ── */}
        {view==="formulario" && (
          <div className="card" style={{ padding:"32px 36px", maxWidth:840, margin:"0 auto" }}>
            <div style={{ marginBottom:26 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#1a2340", marginBottom:4 }}>
                {editingId?"✏️ Editar Pedido":"📥 Nuevo Pedido"}
              </h2>
              <p style={{ fontSize:14, color:"#8a93a8" }}>{editingId?"Modificá los datos del pedido.":"Completá el formulario para registrar el pedido."}</p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              {/* Categoría */}
              <div style={{ gridColumn:"1 / -1" }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:8 }}>Categoría *</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {CATEGORIAS.map(cat => {
                    const cc = CATEGORIA_COLOR[cat]; const sel = formData.categoria===cat;
                    return (
                      <button key={cat} onClick={() => setFormData(p=>({...p,categoria:cat}))}
                        style={{ padding:"7px 14px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", transition:"all .18s",
                          border:sel?`2px solid ${cc.accent}`:"2px solid #dde3ef",
                          background:sel?cc.bg:"#f8faff", color:sel?cc.text:"#6b7a9a",
                          transform:sel?"scale(1.05)":"scale(1)", boxShadow:sel?`0 2px 8px ${cc.accent}33`:"none" }}>
                        {CATEGORIA_ICON[cat]} {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ gridColumn:"1 / -1" }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Descripción del pedido *</label>
                <input value={formData.nombre} onChange={e=>setFormData(p=>({...p,nombre:e.target.value}))}
                  placeholder="Ej: Remeras con logo, Banner 2x1m..." style={inp("nombre")}/>
                {errors.nombre && <div style={{ color:"#ef5350", fontSize:12, marginTop:4 }}>{errors.nombre}</div>}
              </div>

              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Cliente *</label>
                <input value={formData.cliente} onChange={e=>setFormData(p=>({...p,cliente:e.target.value}))}
                  placeholder="Nombre del cliente" style={inp("cliente")}/>
                {errors.cliente && <div style={{ color:"#ef5350", fontSize:12, marginTop:4 }}>{errors.cliente}</div>}
              </div>

              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Teléfono</label>
                <input value={formData.telefono} onChange={e=>setFormData(p=>({...p,telefono:e.target.value}))} placeholder="11-xxxx-xxxx" style={inp()}/>
              </div>

              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Estado</label>
                <select value={formData.estado} onChange={e=>setFormData(p=>({...p,estado:e.target.value}))} style={{ ...inp(), cursor:"pointer" }}>
                  {ESTADOS.filter(e=>e!=="Todos").map(e=><option key={e}>{e}</option>)}
                </select>
                {formData.estado==="En Producción" && (
                  <div style={{ marginTop:6, fontSize:12, color:"#0d47a1", background:"#e3f2fd", borderRadius:6, padding:"5px 10px" }}>
                    🖨️ Se generará la orden de trabajo al guardar
                  </div>
                )}
              </div>

              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Fecha del Pedido</label>
                <input type="date" value={formData.fechaPedido} onChange={e=>setFormData(p=>({...p,fechaPedido:e.target.value}))} style={inp()}/>
              </div>

              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Fecha de Entrega *</label>
                <input type="date" value={formData.fechaEntrega} onChange={e=>setFormData(p=>({...p,fechaEntrega:e.target.value}))} style={inp("fechaEntrega")}/>
                {errors.fechaEntrega && <div style={{ color:"#ef5350", fontSize:12, marginTop:4 }}>{errors.fechaEntrega}</div>}
              </div>

              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Precio Total ($)</label>
                <input type="number" value={formData.precio} onChange={e=>setFormData(p=>({...p,precio:e.target.value}))} placeholder="0.00" style={inp()}/>
              </div>

              <div>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Seña / Adelanto ($)</label>
                <input type="number" value={formData.seña} onChange={e=>setFormData(p=>({...p,seña:e.target.value}))} placeholder="0.00" style={inp()}/>
              </div>

              {(formData.precio||formData.seña) && (
                <div style={{ gridColumn:"1 / -1", background:"#f0f3f9", borderRadius:10, padding:"12px 18px", display:"flex", gap:24 }}>
                  <div><span style={{ fontSize:12, color:"#8a93a8" }}>Total: </span><strong>${parseFloat(formData.precio||0).toLocaleString("es-AR")}</strong></div>
                  <div><span style={{ fontSize:12, color:"#8a93a8" }}>Seña: </span><strong style={{ color:"#2e7d32" }}>${parseFloat(formData.seña||0).toLocaleString("es-AR")}</strong></div>
                  <div><span style={{ fontSize:12, color:"#8a93a8" }}>Saldo: </span><strong style={{ color:saldo(formData)>0?"#c62828":"#2e7d32" }}>${saldo(formData).toLocaleString("es-AR")}</strong></div>
                </div>
              )}

              <div style={{ gridColumn:"1 / -1" }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Notas / Detalles</label>
                <textarea value={formData.notas} onChange={e=>setFormData(p=>({...p,notas:e.target.value}))}
                  placeholder="Medidas, colores, cantidad, especificaciones..." rows={3}
                  style={{ ...inp(), resize:"vertical" }}/>
              </div>
            </div>

            <div style={{ display:"flex", gap:12, marginTop:28, justifyContent:"flex-end" }}>
              <button className="btn-g" onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setErrors({}); setView("lista"); }}>Cancelar</button>
              <button className="btn-p" onClick={handleSubmit}>{editingId?"💾 Guardar Cambios":"✅ Guardar Pedido"}</button>
            </div>
          </div>
        )}

        {/* ── DETALLE ── */}
        {view==="detalle" && selectedPedido && (() => {
          const p  = pedidos.find(x => x.id===selectedPedido.id)||selectedPedido;
          const ec = ESTADO_COLOR[p.estado];
          const cc = CATEGORIA_COLOR[p.categoria];
          return (
            <div className="card" style={{ padding:"32px 36px", maxWidth:720, margin:"0 auto" }}>
              <button className="btn-g" style={{ marginBottom:22, fontSize:13 }} onClick={() => setView("lista")}>← Volver</button>
              <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:22 }}>
                <div>
                  <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#1a2340", marginBottom:8 }}>{p.nombre}</h2>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <span style={{ background:cc.bg, color:cc.text, padding:"5px 12px", borderRadius:20, fontSize:13, fontWeight:700 }}>{CATEGORIA_ICON[p.categoria]} {p.categoria}</span>
                    <span style={{ background:ec.bg, color:ec.text, padding:"5px 12px", borderRadius:20, fontSize:13, fontWeight:600 }}>{p.estado}</span>
                    {isVencido(p) && <span style={{ background:"#ffebee", color:"#c62828", padding:"5px 12px", borderRadius:20, fontSize:13, fontWeight:600 }}>⚠️ Vencido</span>}
                    {isHoy(p)    && <span style={{ background:"#fff8e1", color:"#f57f17", padding:"5px 12px", borderRadius:20, fontSize:13, fontWeight:600 }}>📍 Entrega hoy</span>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button className="btn-imp" style={{ padding:"9px 16px", fontSize:14 }} onClick={() => imprimirOrden(p, empresa)}>🖨️ Imprimir Orden</button>
                  <button className="btn-g" onClick={() => handleEdit(p)}>✏️ Editar</button>
                  <button className="btn-d" onClick={() => handleDelete(p.id)}>🗑</button>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
                {[
                  { label:"Cliente",          value:p.cliente,          icon:"🏢" },
                  { label:"Teléfono",         value:p.telefono||"—",    icon:"📞" },
                  { label:"Fecha de Pedido",  value:p.fechaPedido||"—", icon:"📅" },
                  { label:"Fecha de Entrega", value:p.fechaEntrega||"—",icon:"🏁" },
                ].map(item => (
                  <div key={item.label} style={{ background:"#f8faff", borderRadius:10, padding:"13px 16px" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#8a93a8", textTransform:"uppercase", letterSpacing:".7px", marginBottom:4 }}>{item.icon} {item.label}</div>
                    <div style={{ fontWeight:600, color:"#1a2340" }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:"#f0f3f9", borderRadius:12, padding:"18px 20px", marginBottom:16, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                {[
                  { label:"Precio Total",    value:`$${parseFloat(p.precio||0).toLocaleString("es-AR")}`, color:"#1a2340" },
                  { label:"Seña / Adelanto", value:`$${parseFloat(p.seña||0).toLocaleString("es-AR")}`,   color:"#2e7d32" },
                  { label:"Saldo Pendiente", value:`$${saldo(p).toLocaleString("es-AR")}`,                color:saldo(p)>0?"#c62828":"#2e7d32" },
                ].map(f => (
                  <div key={f.label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#8a93a8", textTransform:"uppercase", letterSpacing:".6px", marginBottom:5 }}>{f.label}</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:f.color }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {p.notas && (
                <div style={{ background:"#f8faff", borderRadius:10, padding:"16px 18px" }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#8a93a8", textTransform:"uppercase", letterSpacing:".7px", marginBottom:7 }}>📝 Notas</div>
                  <p style={{ color:"#4a5568", lineHeight:1.6, fontSize:14 }}>{p.notas}</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── VISTA PEDIDOS LISTOS ── */}
        {view==="listos" && (
          <PedidosListos
            pedidos={pedidos}
            saldo={saldo}
            isHoy={isHoy}
            handleEstadoChange={handleEstadoChange}
            handleDelete={handleDelete}
            setMsgModal={setMsgModal}
            CATEGORIA_COLOR={CATEGORIA_COLOR}
            CATEGORIA_ICON={CATEGORIA_ICON}
            inp={inp}
          />
        )}

        {/* ── CONFIGURACIÓN ── */}
        {view==="config" && (
          <ConfigView
            empresa={empresa}
            setEmpresa={setEmpresa}
            empresaSaved={empresaSaved}
            setEmpresaSaved={setEmpresaSaved}
          />
        )}
      </div>

      {/* ── MODAL MENSAJE AL CLIENTE ── */}
      {msgModal && (() => {
        const p   = msgModal.pedido;
        const tot = parseFloat(p.precio||0).toLocaleString("es-AR");
        const sal = (parseFloat(p.precio||0) - parseFloat(p.seña||0)).toLocaleString("es-AR");
        const msg = `¡Hola ${p.cliente}! 👋\nTu pedido *${p.nombre}* ya está listo 🎉\nEl monto total es $${tot} y resta abonar $${sal}.\nPodés transferir al alias *mafaldagrafica*.\n¡Muchas gracias por tu compra!`;
        const handleCopy = () => {
          navigator.clipboard.writeText(msg).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          });
        };
        return (
          <div className="modal-ov" onClick={() => setMsgModal(null)}>
            <div className="msg-bx" onClick={e => e.stopPropagation()}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
                <div style={{ fontSize:36 }}>💬</div>
                <div>
                  <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:700, color:"#1a2340", lineHeight:1.1 }}>Mensaje para el cliente</h3>
                  <p style={{ fontSize:13, color:"#8a93a8", marginTop:3 }}>Copiá el mensaje y enviáselo por WhatsApp</p>
                </div>
              </div>

              {/* Badge cliente */}
              <div style={{ background:"#e8f5e9", borderRadius:8, padding:"8px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
                <span>🏢</span>
                <span style={{ fontWeight:600, color:"#1b5e20" }}>{p.cliente}</span>
                {p.telefono && <span style={{ color:"#4a5568" }}>· {p.telefono}</span>}
              </div>

              {/* Mensaje editable */}
              <textarea
                className="msg-textarea"
                rows={6}
                defaultValue={msg}
                id="msg-cliente-textarea"
              />

              <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"flex-end" }}>
                <button className="btn-g" style={{ padding:"10px 20px" }} onClick={() => setMsgModal(null)}>Cerrar</button>
                <button className={`btn-copy${copied?" copied":""}`} onClick={handleCopy}>
                  {copied ? "✅ ¡Copiado!" : "📋 Copiar mensaje"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL IMPRESIÓN AUTOMÁTICA ── */}
      {printModal && (
        <div className="modal-ov" onClick={() => setPrintModal(null)}>
          <div className="modal-bx" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:52, marginBottom:14 }}>🖨️</div>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:"#1a2340", marginBottom:8 }}>
              ¡Pedido en Producción!
            </h3>
            <p style={{ fontSize:15, color:"#1a2340", fontWeight:600, marginBottom:4 }}>{printModal.pedido.nombre}</p>
            <p style={{ fontSize:14, color:"#8a93a8", marginBottom:28 }}>¿Querés imprimir la orden de trabajo ahora?</p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button className="btn-g" style={{ padding:"10px 24px" }} onClick={() => setPrintModal(null)}>Ahora no</button>
              <button className="btn-imp" style={{ padding:"11px 24px", fontSize:15, borderRadius:9 }}
                onClick={() => { imprimirOrden(printModal.pedido, empresa); setPrintModal(null); }}>
                🖨️ Imprimir orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:26, right:26, padding:"13px 20px",
          background:toast.type==="error"?"#ef5350":"#1b5e20",
          color:"#fff", borderRadius:10, fontSize:14, fontWeight:600,
          boxShadow:"0 8px 24px rgba(0,0,0,.2)", zIndex:1000 }}>
          {toast.type==="error"?"🗑 ":"✅ "}{toast.msg}
        </div>
      )}
    </div>
  );
}
