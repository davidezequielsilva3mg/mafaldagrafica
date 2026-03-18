import { useState, useMemo, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, setDoc, getDoc, getDocs
} from "firebase/firestore";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "firebase/auth";

const auth = getAuth();

const CATEGORIAS = [
  "Vinilo Impreso", "Vinilo Calado", "Diseño", "Impresiones",
  "DTF", "Sublimado", "Estampado", "Talonarios", "Lona", "3D", "Otros"
];

const CATEGORIA_ICON = {
  "Vinilo Impreso": "🖨️", "Vinilo Calado": "✂️", "Diseño": "🎨",
  "Impresiones": "📄", "DTF": "👕", "Sublimado": "🌈",
  "Estampado": "🔖", "Talonarios": "📒", "Lona": "🪧", "3D": "🖨️", "Otros": "📦"
};

const CATEGORIA_COLOR = {
  "Vinilo Impreso": { bg: "#fff3e0", text: "#bf360c", accent: "#1976d2" },
  "Vinilo Calado":  { bg: "#e8eaf6", text: "#283593", accent: "#3949ab" },
  "Diseño":         { bg: "#fce4ec", text: "#880e4f", accent: "#e91e63" },
  "Impresiones":    { bg: "#e0f2f1", text: "#004d40", accent: "#009688" },
  "DTF":            { bg: "#fff3e0", text: "#e65100", accent: "#ff9800" },
  "Sublimado":      { bg: "#f3e5f5", text: "#4a148c", accent: "#9c27b0" },
  "Estampado":      { bg: "#fff8e1", text: "#f57f17", accent: "#ffc107" },
  "Talonarios":     { bg: "#e8f5e9", text: "#1b5e20", accent: "#4caf50" },
  "Lona":           { bg: "#efebe9", text: "#3e2723", accent: "#795548" },
  "3D":             { bg: "#e8f5e9", text: "#1b5e20", accent: "#388e3c" },
  "Otros":          { bg: "#f5f5f5", text: "#424242", accent: "#9e9e9e" },
};

const ESTADOS = ["Todos", "Pendiente", "En Producción", "Listo", "Entregado"];
const ESTADO_COLOR = {
  Pendiente:        { bg: "#f5f5f5", text: "#616161" },
  "En Producción":  { bg: "#fff3e0", text: "#bf360c" },
  Listo:            { bg: "#fff8e1", text: "#f57f17" },
  Entregado:        { bg: "#e8f5e9", text: "#1b5e20" },
};

const EMPTY_FORM = {
  nombre: "", cliente: "", telefono: "", categoria: "Vinilo Impreso",
  estado: "Pendiente", fechaPedido: "", fechaEntrega: "", precio: "",
  seña: "", notas: ""
};



const EMPTY_CLIENTE = {
  nombre: "", apellido: "", empresa: "", cuit: "",
  direccion: "", telefono: "", mail: "", saldoCuenta: 0
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
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}#root{width:100%;min-height:100vh;display:flex;flex-direction:column}
  body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a2340}
  .page{width:210mm;min-height:148mm;margin:0 auto;padding:20mm 20mm 16mm}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:13px;border-bottom:3px solid #e65100;margin-bottom:16px}
  .hdr-left{display:flex;align-items:center;gap:14px}
  .logo-img{width:60px;height:60px;object-fit:contain;border-radius:8px}
  .brand{font-family:'DM Sans',sans-serif;font-size:24px;font-weight:800;color:#e65100}
  .brand-data{font-size:11px;color:#8a7060;margin-top:3px;line-height:1.6}
  .onum{font-family:'DM Sans',sans-serif;font-size:20px;font-weight:800;color:#e65100;text-align:right}
  .ofecha{font-size:11px;color:#a09080;text-align:right;margin-top:3px}
  .banner{background:#fff3e0;color:#bf360c;text-align:center;padding:7px 0;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px}
  .ped{background:#fff8f5;border-radius:8px;padding:12px 15px;margin-bottom:14px}
  .ped-lbl{font-size:10px;font-weight:600;color:#a09080;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
  .ped-nom{font-family:'DM Sans',sans-serif;font-size:18px;font-weight:700;color:#1a2340}
  .ped-cat{display:inline-block;margin-top:5px;font-size:12px;font-weight:600;color:#e65100;background:#dde6ff;padding:3px 10px;border-radius:20px}
  .igrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:13px}
  .ibox{background:#fffaf7;border-radius:7px;padding:9px 12px;border-left:3px solid #e65100}
  .ilbl{font-size:10px;font-weight:600;color:#a09080;text-transform:uppercase;letter-spacing:.7px;margin-bottom:3px}
  .ival{font-size:14px;font-weight:600;color:#1a2340}
  .notas{border:1.5px dashed #c5cce0;border-radius:7px;padding:10px 13px;margin-bottom:13px;min-height:44px}
  .ntit{font-size:10px;font-weight:600;color:#a09080;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
  .ntxt{font-size:13px;color:#4a5568;line-height:1.5}
  .fgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:16px}
  .fbox{text-align:center;background:#fffaf7;border-radius:7px;padding:9px 7px}
  .flbl{font-size:10px;font-weight:600;color:#a09080;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}
  .fval{font-family:'DM Sans',sans-serif;font-size:17px;font-weight:700}
  .foot{border-top:1.5px solid #edf0f7;padding-top:11px;display:flex;justify-content:space-between;align-items:flex-end}
  .firma{text-align:center}
  .flin{width:160px;border-bottom:1.5px solid #8a93a8;margin-bottom:4px;height:26px}
  .flbl2{font-size:10px;color:#a09080;text-transform:uppercase;letter-spacing:.6px}
  .fnota{font-size:10px;color:#a09080;text-align:right;line-height:1.6}
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
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, padding:"10px 14px", background:"#fff", borderRadius:10, boxShadow:"0 2px 8px rgba(230,81,0,.07)", borderTop:`3px solid ${colAccent}` }}>
              <span style={{ background:ec.bg, color:ec.text, padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>{col}</span>
              <span style={{ background:colAccent, color:"#fff", borderRadius:"50%", width:20, height:20, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, marginLeft:"auto" }}>{items.length}</span>
            </div>
            {/* Cards */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {items.length === 0 ? (
                <div style={{ border:"2px dashed #e0e5f0", borderRadius:10, padding:"24px 16px", textAlign:"center", color:"#d4bfb0", fontSize:13 }}>Sin pedidos</div>
              ) : items.map(p => {
                const cc  = CATEGORIA_COLOR[p.categoria];
                const ven = isVencido(p);
                const hf  = isHoy(p);
                return (
                  <div key={p.id} onClick={() => { setSelectedPedido(p); setView("detalle"); }}
                    style={{ background:"#fff", borderRadius:10, padding:"14px 15px", boxShadow:"0 2px 10px rgba(230,81,0,.08)", cursor:"pointer", borderLeft:`3px solid ${cc.accent}`, transition:"transform .15s, box-shadow .15s", position:"relative" }}
                    onMouseOver={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 18px rgba(230,81,0,.13)"; }}
                    onMouseOut={e  => { e.currentTarget.style.transform="translateY(0)";   e.currentTarget.style.boxShadow="0 2px 10px rgba(230,81,0,.08)"; }}>
                    {/* Categoria badge */}
                    <span style={{ background:cc.bg, color:cc.text, fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, display:"inline-block", marginBottom:8 }}>
                      {CATEGORIA_ICON[p.categoria]} {p.categoria}
                    </span>
                    <div style={{ fontWeight:700, fontSize:14, color:"#1a2340", marginBottom:4, lineHeight:1.3 }}>{p.nombre}</div>
                    <div style={{ fontSize:12, color:"#8a7060", marginBottom:8 }}>👤 {p.cliente}</div>
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
                      <button style={{ background:"transparent", border:"1.5px solid #f0d5c0", color:"#4a5568", padding:"4px 8px", borderRadius:6, fontSize:12, cursor:"pointer" }} onClick={() => handleEdit(p)}>✏️</button>
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
                background:modoCalendario===m?"#e65100":"#fff",
                color:modoCalendario===m?"#fff":"#4a5568",
                boxShadow:modoCalendario===m?"0 3px 10px rgba(230,81,0,.2)":"0 1px 6px rgba(230,81,0,.07)" }}>
              {m==="dia"?"Día":m==="semana"?"Semana":"Mes"}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => moverFecha(-1)} style={{ background:"#fff", border:"1.5px solid #f0d5c0", color:"#1a2340", width:34, height:34, borderRadius:8, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
          <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:16, color:"#1a2340", minWidth:220, textAlign:"center", textTransform:"capitalize" }}>{tituloNavegacion()}</span>
          <button onClick={() => moverFecha(1)}  style={{ background:"#fff", border:"1.5px solid #f0d5c0", color:"#1a2340", width:34, height:34, borderRadius:8, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
          <button onClick={() => setFechaBase(new Date())} style={{ padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:600, border:"1.5px solid #e65100", color:"#e65100", background:"#fff", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Hoy</button>
        </div>
      </div>

      {/* Grilla */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
        {/* Cabecera días de semana (solo mes/semana) */}
        {modoCalendario !== "dia" && (
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${modoCalendario==="semana"?7:7}, 1fr)`, borderBottom:"2px solid #edf0f7" }}>
            {DIAS_SEMANA.map(d => (
              <div key={d} style={{ padding:"10px 8px", textAlign:"center", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px" }}>{d}</div>
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
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:esHoy?"#e65100":"#1a2340" }}>
                  {diasAMostrar[0].toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}
                </div>
                {esHoy && <span style={{ background:"#e65100", color:"#fff", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>Hoy</span>}
                <span style={{ background:"#fff8f5", color:"#4a5568", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{ps.length} pedido{ps.length!==1?"s":""}</span>
              </div>
              {ps.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#d4bfb0", fontSize:14 }}>Sin pedidos para este día</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {ps.map(p => {
                    const cc = CATEGORIA_COLOR[p.categoria];
                    const ec = ESTADO_COLOR[p.estado];
                    return (
                      <div key={p.id} onClick={() => { setSelectedPedido(p); setView("detalle"); }}
                        style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderRadius:10, border:`1.5px solid ${cc.accent}22`, background:cc.bg+"44", cursor:"pointer", transition:"box-shadow .15s" }}
                        onMouseOver={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(230,81,0,.12)"}
                        onMouseOut={e=>e.currentTarget.style.boxShadow="none"}>
                        <span style={{ fontSize:22 }}>{CATEGORIA_ICON[p.categoria]}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, color:"#1a2340", fontSize:14 }}>{p.nombre}</div>
                          <div style={{ fontSize:12, color:"#8a7060" }}>👤 {p.cliente} {p.telefono && <span style={{ fontWeight:700, color:"#e65100" }}>· 📞 {p.telefono}</span>}</div>
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
                      background:esHoy?"#e65100":"transparent", color:esHoy?"#fff":domingo?"#c62828":"#4a5568" }}>
                      {d.getDate()}
                    </span>
                    {ps.length > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#e65100", background:"#ffe8d6", borderRadius:10, padding:"1px 5px" }}>{ps.length}</span>}
                  </div>
                  <div>
                    {(modoCalendario==="mes" ? ps.slice(0,2) : ps).map(p => <PedidoChip key={p.id} p={p} cc={CATEGORIA_COLOR[p.categoria]} ven={isVencido(p)} setSelectedPedido={setSelectedPedido} setView={setView} CATEGORIA_COLOR={CATEGORIA_COLOR} />)}
                    {modoCalendario==="mes" && ps.length > 2 && (
                      <div style={{ fontSize:10, color:"#a09080", fontWeight:600, paddingLeft:4 }}>+{ps.length-2} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div style={{ marginTop:14, display:"flex", gap:16, flexWrap:"wrap", fontSize:12, color:"#a09080", alignItems:"center" }}>
        <span>Leyenda:</span>
        <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:"#fff3e0", border:"1.5px solid #e65100", display:"inline-block" }}></span> Hoy</span>
        <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:"#ffebee", border:"1.5px solid #c62828", display:"inline-block" }}></span> Vencido</span>
        <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:"#fafafa", border:"1.5px solid #f0d5c0", display:"inline-block" }}></span> Fuera del mes</span>
      </div>
    </div>
  );
}


function PedidosListos({ pedidos, saldo, isHoy, handleEstadoChange, handleDelete, setMsgModal, CATEGORIA_COLOR, CATEGORIA_ICON, inp }) {
  const [busqL, setBusqL]       = useState("");
  const [busqH, setBusqH]       = useState("");
  const [tabActiva, setTabActiva] = useState("listos");

  const listos = pedidos
    .filter(p => p.estado === "Listo")
    .sort((a,b) => (!a.fechaEntrega?1:!b.fechaEntrega?-1:a.fechaEntrega.localeCompare(b.fechaEntrega)));

  const filtrados = listos.filter(p => {
    const q = busqL.toLowerCase();
    return !busqL || p.nombre.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q);
  });

  const totalCobrar = listos.reduce((s,p) => s + saldo(p), 0);

  const entregados = pedidos
    .filter(p => p.estado === "Entregado")
    .sort((a,b) => b.fechaEntrega?.localeCompare(a.fechaEntrega||"")||0);

  const entregadosFiltrados = entregados.filter(p => {
    const q = busqH.toLowerCase();
    return !busqH || p.nombre.toLowerCase().includes(q) || p.cliente.toLowerCase().includes(q) || p.telefono?.includes(busqH);
  });

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        <button onClick={()=>setTabActiva("listos")}
          style={{ padding:"9px 20px", borderRadius:20, fontSize:14, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif",
            background:tabActiva==="listos"?"#e65100":"#fff", color:tabActiva==="listos"?"#fff":"#4a5568",
            boxShadow:tabActiva==="listos"?"0 3px 10px rgba(230,81,0,.2)":"0 1px 6px rgba(230,81,0,.07)" }}>
          ✅ Listos para entregar
          {listos.length > 0 && <span style={{ marginLeft:7, background:tabActiva==="listos"?"rgba(255,255,255,.3)":"#fff3e0", color:tabActiva==="listos"?"#fff":"#e65100", borderRadius:20, padding:"0 7px", fontSize:12, fontWeight:700 }}>{listos.length}</span>}
        </button>
        <button onClick={()=>setTabActiva("historial")}
          style={{ padding:"9px 20px", borderRadius:20, fontSize:14, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif",
            background:tabActiva==="historial"?"#1a2340":"#fff", color:tabActiva==="historial"?"#fff":"#4a5568",
            boxShadow:tabActiva==="historial"?"0 3px 10px rgba(26,35,64,.2)":"0 1px 6px rgba(230,81,0,.07)" }}>
          📦 Historial de Entregados
          {entregados.length > 0 && <span style={{ marginLeft:7, background:tabActiva==="historial"?"rgba(255,255,255,.2)":"#f0f3f9", color:tabActiva==="historial"?"#fff":"#4a5568", borderRadius:20, padding:"0 7px", fontSize:12, fontWeight:700 }}>{entregados.length}</span>}
        </button>
      </div>

      {/* ── TAB: LISTOS ── */}
      {tabActiva === "listos" && (
        <div>
          {/* Stats */}
          <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap" }}>
            <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"12px 20px", textAlign:"center" }}>
              <div style={{ fontSize:10, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", marginBottom:4 }}>Pedidos listos</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:"#f57f17" }}>{listos.length}</div>
            </div>
            <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"12px 20px", textAlign:"center" }}>
              <div style={{ fontSize:10, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", marginBottom:4 }}>Por cobrar</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:"#c62828" }}>${totalCobrar.toLocaleString("es-AR")}</div>
            </div>
          </div>

          {/* Buscador */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"14px 18px", marginBottom:18 }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>🔍</span>
              <input placeholder="Buscar por pedido o cliente..." value={busqL} onChange={e=>setBusqL(e.target.value)}
                style={{ ...inp(), paddingLeft:34, width:"100%" }}/>
            </div>
          </div>

          {filtrados.length === 0 ? (
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"52px 24px", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:14 }}>🎉</div>
              <div style={{ fontWeight:700, fontSize:18, fontFamily:"'DM Sans',sans-serif", marginBottom:6 }}>
                {listos.length === 0 ? "No hay pedidos listos aún" : "Sin resultados"}
              </div>
              <div style={{ color:"#a09080", fontSize:14 }}>
                {listos.length === 0 ? "Cuando un pedido pase a 'Listo' aparecerá aquí" : "Probá con otro término"}
              </div>
            </div>
          ) : (
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
                <thead>
                  <tr style={{ background:"#fffaf7" }}>
                    {["Pedido","Categoría","Cliente","Fecha Entrega","Total","Saldo","Acciones"].map(h=>(
                      <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontWeight:600, fontSize:11, color:"#8a7060", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap", borderBottom:"1px solid #f5e8e0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(p => {
                    const cc = CATEGORIA_COLOR[p.categoria];
                    const hf = isHoy(p);
                    return (
                      <tr key={p.fireId||p.id} style={{ borderBottom:"1px solid #fef0e8", background:hf?"#fffdf0":"#fff" }}>
                        <td style={{ padding:"13px 16px" }}>
                          <div style={{ fontWeight:600, color:"#1a2340" }}>{p.nombre}</div>
                          {p.notas && <div style={{ fontSize:11, color:"#a09080", marginTop:2, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.notas}</div>}
                        </td>
                        <td style={{ padding:"13px 16px" }}>
                          <span style={{ background:cc.bg, color:cc.text, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{CATEGORIA_ICON[p.categoria]} {p.categoria}</span>
                        </td>
                        <td style={{ padding:"13px 16px", color:"#4a5568", whiteSpace:"nowrap" }}>
                          <div style={{ fontWeight:600 }}>{p.cliente}</div>
                          {p.telefono && <div style={{ fontSize:12, fontWeight:700, color:"#e65100", marginTop:2 }}>📞 {p.telefono}</div>}
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
                            <button style={{ background:"#e65100", color:"#fff", border:"none", padding:"6px 12px", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }} onClick={() => handleEstadoChange(p.id, "Entregado")}>📦 Entregar</button>
                            <button style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"7px 12px", borderRadius:7, fontSize:13, fontWeight:600, cursor:"pointer" }} onClick={() => handleDelete(p.id)}>🗑</button>
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
      )}

      {/* ── TAB: HISTORIAL ── */}
      {tabActiva === "historial" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <p style={{ fontSize:14, color:"#a09080" }}>{entregados.length} pedido{entregados.length!==1?"s":""} entregado{entregados.length!==1?"s":""}</p>
          </div>

          {/* Buscador propio */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"14px 18px", marginBottom:18 }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>🔍</span>
              <input placeholder="Buscar en historial..." value={busqH} onChange={e=>setBusqH(e.target.value)}
                style={{ ...inp(), paddingLeft:34, width:"100%" }}/>
            </div>
          </div>

          {entregadosFiltrados.length === 0 ? (
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"52px 24px", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:14 }}>📦</div>
              <div style={{ fontWeight:700, fontSize:18, fontFamily:"'DM Sans',sans-serif", marginBottom:6 }}>
                {entregados.length === 0 ? "Sin pedidos entregados aún" : "Sin resultados"}
              </div>
            </div>
          ) : (
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
                <thead>
                  <tr style={{ background:"#fffaf7" }}>
                    {["Pedido","Categoría","Cliente","Teléfono","Fecha Entrega","Total",""].map(h=>(
                      <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontWeight:600, fontSize:11, color:"#8a7060", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap", borderBottom:"1px solid #f5e8e0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entregadosFiltrados.map(p => {
                    const cc = CATEGORIA_COLOR[p.categoria] || {bg:"#f5f5f5",text:"#424242"};
                    return (
                      <tr key={p.fireId||p.id} style={{ borderBottom:"1px solid #fef0e8", opacity:.9 }}>
                        <td style={{ padding:"11px 16px", fontWeight:600, color:"#4a5568" }}>{p.nombre}</td>
                        <td style={{ padding:"11px 16px" }}>
                          <span style={{ background:cc.bg, color:cc.text, padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:600 }}>{CATEGORIA_ICON[p.categoria]} {p.categoria}</span>
                        </td>
                        <td style={{ padding:"11px 16px", fontWeight:600, color:"#1a2340" }}>{p.cliente}</td>
                        <td style={{ padding:"11px 16px", fontWeight:700, color:"#e65100", fontSize:12 }}>{p.telefono?`📞 ${p.telefono}`:"—"}</td>
                        <td style={{ padding:"11px 16px", color:"#4a5568" }}>{p.fechaEntrega||"—"}</td>
                        <td style={{ padding:"11px 16px", fontWeight:700, color:"#1a2340" }}>{p.precio?`$${parseFloat(p.precio).toLocaleString("es-AR")}`:"—"}</td>
                        <td style={{ padding:"11px 16px" }}>
                          <span style={{ background:"#e8f5e9", color:"#1b5e20", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600 }}>✅ Entregado</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
        style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"#1a2340", outline:"none", boxSizing:"border-box" }}/>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:26 }}>
        <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:"#1a2340", marginBottom:4 }}>⚙️ Configuración del Local</h2>
        <p style={{ fontSize:14, color:"#a09080" }}>Estos datos aparecerán en todas las órdenes de trabajo que imprimas.</p>
      </div>

      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"32px 36px" }}>
        {/* Logo */}
        <div style={{ marginBottom:28 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:10 }}>Logo del local</label>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ width:90, height:90, borderRadius:14, border:"2px dashed #c5cce0", background:"#fffaf7", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
              {preview ? <img src={preview} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }}/> : <span style={{ fontSize:32, opacity:.4 }}>🖼️</span>}
            </div>
            <div>
              <label style={{ display:"inline-block", background:"#e65100", color:"#fff", padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                📁 Subir imagen
                <input type="file" accept="image/*" onChange={handleLogo} style={{ display:"none" }}/>
              </label>
              {preview && (
                <button onClick={() => { setPreview(""); setForm(f=>({...f,logo:""})); }}
                  style={{ marginLeft:10, background:"transparent", border:"1.5px solid #ef5350", color:"#ef5350", padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  ✕ Quitar
                </button>
              )}
              <p style={{ fontSize:12, color:"#a09080", marginTop:8 }}>PNG, JPG o SVG. Recomendado: fondo transparente.</p>
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
        <div style={{ marginTop:28, background:"#fff8f5", borderRadius:12, padding:"18px 20px" }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", marginBottom:12 }}>👁️ Vista previa del encabezado de la orden</div>
          <div style={{ background:"#fff", borderRadius:10, padding:"16px 20px", borderBottom:"3px solid #e65100", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {preview && <img src={preview} alt="Logo" style={{ width:50, height:50, objectFit:"contain", borderRadius:7 }}/>}
              <div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#e65100" }}>{form.nombre||"Nombre del local"}</div>
                <div style={{ fontSize:11, color:"#8a7060", marginTop:3, lineHeight:1.7 }}>
                  {form.titular   && <div>Titular: {form.titular}</div>}
                  {form.cuit      && <div>CUIT: {form.cuit}</div>}
                  {form.direccion && <div>📍 {form.direccion}</div>}
                  {form.telefono  && <div>📞 {form.telefono}</div>}
                </div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:"#e65100" }}>OT-0001</div>
              <div style={{ fontSize:11, color:"#a09080", marginTop:2 }}>Emitida: hoy</div>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:24 }}>
          <button style={{ background:"#e65100", color:"#fff", border:"none", padding:"11px 28px", borderRadius:8, fontSize:15, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:8 }} onClick={handleSave}>
            {empresaSaved ? "✅ ¡Guardado!" : "💾 Guardar configuración"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pantalla de Login ─────────────────────────────────────────────────────
function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Completá email y contraseña"); return; }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg, #e65100 0%, #bf360c 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      <div style={{ background:"#fff", borderRadius:20, padding:"48px 44px", width:"100%", maxWidth:420, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }}>
        {/* Logo / título */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:32, fontWeight:700, color:"#e65100", marginBottom:6 }}>Mafalda Gráfica</div>
          <div style={{ fontSize:14, color:"#a09080" }}>Sistema de gestión de pedidos</div>
        </div>

        {/* Form */}
        <div style={{ marginBottom:18 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:7 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="tu@email.com"
            style={{ width:"100%", padding:"11px 14px", borderRadius:9, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"#1a2340", outline:"none", boxSizing:"border-box" }}/>
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:7 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••"
            style={{ width:"100%", padding:"11px 14px", borderRadius:9, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"#1a2340", outline:"none", boxSizing:"border-box" }}/>
        </div>

        {error && (
          <div style={{ background:"#ffebee", color:"#c62828", padding:"10px 14px", borderRadius:8, fontSize:13, marginBottom:18, textAlign:"center" }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading}
          style={{ width:"100%", padding:"13px", background:"#e65100", color:"#fff", border:"none", borderRadius:9, fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .18s", opacity:loading?0.7:1 }}>
          {loading ? "Ingresando..." : "🔐 Ingresar"}
        </button>

        <div style={{ textAlign:"center", marginTop:20, fontSize:12, color:"#d4bfb0" }}>
          Acceso restringido · Solo personal autorizado
        </div>
      </div>
    </div>
  );
}

// ── Helpers para comprobante ─────────────────────────────────────────────
function buildComprobanteHTML(venta, empresa) {
  const num    = `X-${String(venta.numero||1).padStart(5,"0")}`;
  const now    = new Date();
  const fecha  = venta.fecha || now.toLocaleDateString("es-AR");
  const hora   = now.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
  const nombre = empresa?.nombre || "Mafalda Gráfica";
  const rows   = venta.items.map(it => `
    <tr>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${it.cantidad}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${it.codigo||"—"}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0">${it.nombre}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right">$${parseFloat(it.precio).toLocaleString("es-AR")}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700">$${(it.cantidad*it.precio).toLocaleString("es-AR")}</td>
    </tr>`).join("");
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>${num}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}#root{width:100%;min-height:100vh;display:flex;flex-direction:column}
  body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a2340;padding:20mm}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:3px solid #e65100;margin-bottom:18px}
  .brand{font-family:'DM Sans',sans-serif;font-size:24px;font-weight:800;color:#e65100}
  .brand-sub{font-size:11px;color:#a09080;margin-top:3px;line-height:1.6}
  .comp-num{font-family:'DM Sans',sans-serif;font-size:20px;font-weight:800;color:#e65100;text-align:right}
  .comp-tipo{font-size:11px;color:#a09080;text-align:right;margin-top:3px}
  .badge-x{display:inline-block;background:#fff3e0;color:#e65100;border:2px solid #e65100;border-radius:6px;padding:3px 10px;font-size:13px;font-weight:700;margin-top:4px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
  .ibox{background:#fffaf7;border-radius:7px;padding:9px 12px;border-left:3px solid #e65100}
  .ilbl{font-size:10px;font-weight:600;color:#a09080;text-transform:uppercase;letter-spacing:.7px;margin-bottom:3px}
  .ival{font-size:13px;font-weight:600;color:#1a2340}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px}
  thead tr{background:#fff3e0}
  th{padding:9px 10px;text-align:left;font-size:11px;font-weight:700;color:#bf360c;text-transform:uppercase;letter-spacing:.5px}
  th:last-child,th:nth-last-child(2){text-align:right}
  .total-box{background:#fff3e0;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
  .total-lbl{font-size:13px;font-weight:600;color:#bf360c;text-transform:uppercase;letter-spacing:.7px}
  .total-val{font-family:'DM Sans',sans-serif;font-size:26px;font-weight:800;color:#e65100}
  .metodo{font-size:12px;color:#a09080;margin-bottom:16px}
  .foot{border-top:1.5px solid #f0e8e0;padding-top:12px;display:flex;justify-content:space-between;font-size:10px;color:#c0b0a0}
  .no-valido{text-align:center;font-size:11px;color:#c0b0a0;margin-bottom:10px;letter-spacing:.5px}
  @media print{body{padding:12mm 14mm}}
</style></head><body>
<div class="hdr">
  <div>
    ${empresa?.logo?`<img src="${empresa.logo}" style="height:50px;object-fit:contain;margin-bottom:6px;display:block"/>`:""}
    <div class="brand">${nombre}</div>
    <div class="brand-sub">
      ${empresa?.titular?`Titular: ${empresa.titular}<br/>`:""}
      ${empresa?.cuit?`CUIT: ${empresa.cuit}<br/>`:""}
      ${empresa?.direccion?`${empresa.direccion}<br/>`:""}
      ${empresa?.telefono?`Tel: ${empresa.telefono}`:""}
    </div>
  </div>
  <div style="text-align:right">
    <div class="comp-num">${num}</div>
    <div class="comp-tipo">Comprobante</div>
    <div class="badge-x">NO VÁLIDO COMO FACTURA</div>
    <div style="font-size:11px;color:#a09080;margin-top:4px">${fecha} · ${hora}</div>
  </div>
</div>
<div class="info-grid">
  <div class="ibox"><div class="ilbl">Cliente</div><div class="ival">${venta.clienteNombre||"Consumidor Final"}</div></div>
  <div class="ibox"><div class="ilbl">Método de Pago</div><div class="ival">${venta.metodoPago||"—"}</div></div>
</div>
<table>
  <thead><tr><th>Cant.</th><th>Código</th><th>Detalle</th><th style="text-align:right">P.Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="total-box">
  <div class="total-lbl">Total</div>
  <div class="total-val">$${parseFloat(venta.total).toLocaleString("es-AR")}</div>
</div>
<div class="no-valido">⚠️ Este comprobante no tiene validez fiscal · Solo para uso interno</div>
<div class="foot"><span>${nombre}</span><span>${num} · ${fecha}</span></div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
}

function imprimirComprobante(venta, empresa) {
  const html = buildComprobanteHTML(venta, empresa);
  const win  = window.open("","_blank","width=860,height=700");
  if (!win) { alert("Habilitá los popups para imprimir."); return; }
  win.document.write(html);
  win.document.close();
}

// ── Tipos de evento agenda ────────────────────────────────────────────────
const TIPO_EVENTO = {
  recordatorio: { label:"Recordatorio", color:"#1565c0", bg:"#e3f2fd", icon:"🔔" },
  pago:         { label:"Pago",         color:"#2e7d32", bg:"#e8f5e9", icon:"💵" },
  vencimiento:  { label:"Vencimiento",  color:"#c62828", bg:"#ffebee", icon:"⏰" },
  cliente:      { label:"Visita cliente",color:"#6a1b9a",bg:"#f3e5f5", icon:"🤝" },
  libre:        { label:"Libre",        color:"#e65100", bg:"#fff3e0", icon:"📌" },
};

// ── Componente: Agenda ────────────────────────────────────────────────────
function AgendaView({ nuevoEventoModal, setNuevoEventoModal, showToast }) {
  const [eventos, setEventos]       = useState([]);
  const [fechaBase, setFechaBase]   = useState(new Date());
  const [modoVista, setModoVista]   = useState("mes");
  const [editEvento, setEditEvento] = useState(null);
  const [verEvento, setVerEvento]   = useState(null);
  const DIAS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "eventos"), snap => {
      setEventos(snap.docs.map(d=>({...d.data(), fireId:d.id})));
    });
    return () => unsub();
  }, []);

  // Solicitar permiso notificaciones
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Chequear eventos próximos cada minuto
  useEffect(() => {
    const check = () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const ahora = new Date();
      eventos.forEach(ev => {
        if (!ev.notificar) return;
        const evDate = new Date(`${ev.fecha}T${ev.hora||"00:00"}`);
        const diff   = (evDate - ahora) / 60000; // minutos
        if (diff > 0 && diff <= 30 && !ev._notificado) {
          new Notification(`${TIPO_EVENTO[ev.tipo]?.icon||"📌"} ${ev.titulo}`, {
            body: `En ${Math.round(diff)} minutos · ${ev.hora||""}`,
          });
          // Marcar como notificado en memoria
          ev._notificado = true;
        }
      });
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [eventos]);

  const fmtFecha = d => d.toISOString().split("T")[0];
  const hoy      = fmtFecha(new Date());

  const diasMes = () => {
    const año  = fechaBase.getFullYear();
    const mes  = fechaBase.getMonth();
    const first = new Date(año, mes, 1);
    const last  = new Date(año, mes+1, 0);
    const start = new Date(first); start.setDate(start.getDate()-((start.getDay()+6)%7));
    const end   = new Date(last);  end.setDate(end.getDate()+(6-(end.getDay()+6)%7));
    const dias  = [];
    const cur   = new Date(start);
    while (cur <= end) { dias.push(new Date(cur)); cur.setDate(cur.getDate()+1); }
    return dias;
  };

  const diasSemana = () => {
    const lunes = new Date(fechaBase);
    lunes.setDate(lunes.getDate()-((lunes.getDay()+6)%7));
    return Array.from({length:7},(_,i)=>{ const d=new Date(lunes); d.setDate(d.getDate()+i); return d; });
  };

  const dias = modoVista==="mes" ? diasMes() : modoVista==="semana" ? diasSemana() : [new Date(fechaBase)];

  const eventosDia = (fecha) => eventos
    .filter(ev => ev.fecha === fmtFecha(fecha))
    .sort((a,b) => (a.hora||"00:00").localeCompare(b.hora||"00:00"));

  const moverFecha = dir => {
    const d = new Date(fechaBase);
    if (modoVista==="dia")    d.setDate(d.getDate()+dir);
    if (modoVista==="semana") d.setDate(d.getDate()+dir*7);
    if (modoVista==="mes")    d.setMonth(d.getMonth()+dir);
    setFechaBase(d);
  };

  const titulo = () => {
    if (modoVista==="dia")    return fechaBase.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    if (modoVista==="semana") {
      const ds = diasSemana();
      return `${ds[0].getDate()} ${ds[0].toLocaleDateString("es-AR",{month:"short"})} — ${ds[6].getDate()} ${ds[6].toLocaleDateString("es-AR",{month:"short",year:"numeric"})}`;
    }
    return fechaBase.toLocaleDateString("es-AR",{month:"long",year:"numeric"});
  };

  const handleDelete = async (ev) => {
    if (!window.confirm("¿Eliminar este evento?")) return;
    await deleteDoc(doc(db, "eventos", ev.fireId));
    setVerEvento(null);
    showToast("Evento eliminado","error");
  };

  // Próximos eventos (hoy en adelante)
  const proximos = eventos
    .filter(ev => ev.fecha >= hoy)
    .sort((a,b) => a.fecha.localeCompare(b.fecha)||(a.hora||"").localeCompare(b.hora||""))
    .slice(0,5);

  return (
    <div>
      <div className="grid-agenda">

        {/* ── Calendario ── */}
        <div>
          {/* Controles */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <div style={{ display:"flex", gap:6 }}>
              {["dia","semana","mes"].map(m=>(
                <button key={m} onClick={()=>setModoVista(m)}
                  style={{ padding:"7px 16px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif",
                    background:modoVista===m?"#e65100":"#fff", color:modoVista===m?"#fff":"#4a5568",
                    boxShadow:modoVista===m?"0 3px 10px rgba(230,81,0,.2)":"0 1px 6px rgba(230,81,0,.07)" }}>
                  {m==="dia"?"Día":m==="semana"?"Semana":"Mes"}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={()=>moverFecha(-1)} style={{ background:"#fff", border:"1.5px solid #f0d5c0", color:"#1a2340", width:34, height:34, borderRadius:8, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:16, color:"#1a2340", minWidth:240, textAlign:"center", textTransform:"capitalize" }}>{titulo()}</span>
              <button onClick={()=>moverFecha(1)}  style={{ background:"#fff", border:"1.5px solid #f0d5c0", color:"#1a2340", width:34, height:34, borderRadius:8, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
              <button onClick={()=>setFechaBase(new Date())} style={{ padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:600, border:"1.5px solid #e65100", color:"#e65100", background:"#fff", cursor:"pointer" }}>Hoy</button>
              <button onClick={()=>setNuevoEventoModal(true)} style={{ padding:"7px 16px", borderRadius:8, fontSize:13, fontWeight:700, background:"#e65100", color:"#fff", border:"none", cursor:"pointer" }}>+ Evento</button>
            </div>
          </div>

          {/* Grilla */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
            {modoVista!=="dia" && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"2px solid #f5e8e0" }}>
                {DIAS.map(d=>(
                  <div key={d} style={{ padding:"10px 8px", textAlign:"center", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px" }}>{d}</div>
                ))}
              </div>
            )}

            {modoVista==="dia" ? (
              <div style={{ padding:"24px 28px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:fmtFecha(fechaBase)===hoy?"#e65100":"#1a2340", textTransform:"capitalize" }}>
                    {fechaBase.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}
                  </div>
                  {fmtFecha(fechaBase)===hoy && <span style={{ background:"#e65100", color:"#fff", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>Hoy</span>}
                </div>
                {eventosDia(fechaBase).length===0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:"#d4bfb0" }}>Sin eventos — <span style={{ color:"#e65100", cursor:"pointer", fontWeight:600 }} onClick={()=>setNuevoEventoModal(true)}>+ Agregar</span></div>
                ) : eventosDia(fechaBase).map(ev=>{
                  const t = TIPO_EVENTO[ev.tipo]||TIPO_EVENTO.libre;
                  return (
                    <div key={ev.fireId} onClick={()=>setVerEvento(ev)}
                      style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderRadius:10, border:`1.5px solid ${t.color}22`, background:t.bg, marginBottom:10, cursor:"pointer" }}>
                      <span style={{ fontSize:24 }}>{t.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, color:"#1a2340", fontSize:14 }}>{ev.titulo}</div>
                        {ev.descripcion && <div style={{ fontSize:12, color:"#6b7a9a", marginTop:2 }}>{ev.descripcion}</div>}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <span style={{ background:t.bg, color:t.color, padding:"3px 8px", borderRadius:20, fontSize:11, fontWeight:700, border:`1px solid ${t.color}33` }}>{t.label}</span>
                        {ev.hora && <div style={{ fontSize:12, color:"#a09080", marginTop:4 }}>🕐 {ev.hora}</div>}
                        {ev.notificar && <div style={{ fontSize:10, color:"#2e7d32", marginTop:2 }}>🔔 con alerta</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
                {dias.map((d,i)=>{
                  const fecha   = fmtFecha(d);
                  const evs     = eventosDia(d);
                  const esHoy   = fecha===hoy;
                  const esMes   = modoVista==="semana" || d.getMonth()===fechaBase.getMonth();
                  const domingo = d.getDay()===0;
                  return (
                    <div key={i} onClick={()=>{setFechaBase(d);setModoVista("dia");}}
                      style={{ minHeight:modoVista==="mes"?110:160, padding:"8px", borderRight:i%7!==6?"1px solid #f5e8e0":"none", borderBottom:"1px solid #f5e8e0",
                        background:esHoy?"#fff8f5":!esMes?"#fafafa":"#fff", opacity:!esMes?.6:1, cursor:"pointer" }}
                      onMouseOver={e=>e.currentTarget.style.background=esHoy?"#fff3e0":"#fffaf7"}
                      onMouseOut={e=>e.currentTarget.style.background=esHoy?"#fff8f5":!esMes?"#fafafa":"#fff"}>
                      <div style={{ marginBottom:4, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:12, fontWeight:700, width:24, height:24, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:"50%",
                          background:esHoy?"#e65100":"transparent", color:esHoy?"#fff":domingo?"#c62828":"#4a5568" }}>
                          {d.getDate()}
                        </span>
                        {evs.length>0 && <span style={{ fontSize:10, fontWeight:700, color:"#e65100", background:"#fff3e0", borderRadius:10, padding:"1px 5px" }}>{evs.length}</span>}
                      </div>
                      {(modoVista==="mes"?evs.slice(0,2):evs).map(ev=>{
                        const t = TIPO_EVENTO[ev.tipo]||TIPO_EVENTO.libre;
                        return (
                          <div key={ev.fireId} onClick={e=>{e.stopPropagation();setVerEvento(ev);}}
                            style={{ background:t.bg, borderLeft:`2px solid ${t.color}`, borderRadius:4, padding:"2px 5px", marginBottom:2, fontSize:10, fontWeight:600, color:t.color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {t.icon} {ev.titulo}
                          </div>
                        );
                      })}
                      {modoVista==="mes" && evs.length>2 && <div style={{ fontSize:10, color:"#a09080", paddingLeft:4 }}>+{evs.length-2} más</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel lateral: próximos eventos ── */}
        <div>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"20px" }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:700, color:"#1a2340", marginBottom:14 }}>📋 Próximos eventos</div>
            {proximos.length===0 ? (
              <div style={{ textAlign:"center", padding:"20px 0", color:"#d4bfb0", fontSize:13 }}>Sin eventos próximos</div>
            ) : proximos.map(ev=>{
              const t = TIPO_EVENTO[ev.tipo]||TIPO_EVENTO.libre;
              return (
                <div key={ev.fireId} onClick={()=>setVerEvento(ev)}
                  style={{ display:"flex", gap:10, padding:"10px 0", borderBottom:"1px solid #fef0e8", cursor:"pointer" }}
                  onMouseOver={e=>e.currentTarget.style.background="#fffaf7"}
                  onMouseOut={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{t.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:"#1a2340" }}>{ev.titulo}</div>
                    <div style={{ fontSize:11, color:"#a09080", marginTop:2 }}>
                      {ev.fecha===hoy?"Hoy":ev.fecha} {ev.hora&&`· ${ev.hora}`}
                    </div>
                  </div>
                  <span style={{ background:t.bg, color:t.color, padding:"2px 7px", borderRadius:10, fontSize:10, fontWeight:700, alignSelf:"flex-start" }}>{t.label}</span>
                </div>
              );
            })}
          </div>

          {/* Leyenda tipos */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"16px 20px", marginTop:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", marginBottom:10 }}>Tipos de evento</div>
            {Object.entries(TIPO_EVENTO).map(([key,t])=>(
              <div key={key} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ fontSize:16 }}>{t.icon}</span>
                <span style={{ background:t.bg, color:t.color, padding:"2px 8px", borderRadius:10, fontSize:12, fontWeight:600 }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal nuevo/editar evento ── */}
      {(nuevoEventoModal||editEvento) && (
        <ModalEvento
          evento={editEvento}
          onClose={()=>{ setNuevoEventoModal(false); setEditEvento(null); }}
          showToast={showToast}
          fechaInicial={fmtFecha(fechaBase)}
        />
      )}

      {/* ── Modal ver evento ── */}
      {verEvento && (()=>{
        const t = TIPO_EVENTO[verEvento.tipo]||TIPO_EVENTO.libre;
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }} onClick={()=>setVerEvento(null)}>
            <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", width:400, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                <span style={{ fontSize:32 }}>{t.icon}</span>
                <div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#1a2340" }}>{verEvento.titulo}</div>
                  <span style={{ background:t.bg, color:t.color, padding:"2px 8px", borderRadius:10, fontSize:12, fontWeight:600 }}>{t.label}</span>
                </div>
              </div>
              {verEvento.descripcion && <div style={{ fontSize:14, color:"#4a5568", marginBottom:12, lineHeight:1.5 }}>{verEvento.descripcion}</div>}
              <div style={{ fontSize:13, color:"#a09080", marginBottom:16 }}>
                📅 {verEvento.fecha} {verEvento.hora&&`· 🕐 ${verEvento.hora}`}
                {verEvento.notificar && <span style={{ marginLeft:8, color:"#2e7d32" }}>🔔 Con alerta</span>}
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button onClick={()=>handleDelete(verEvento)} style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>🗑 Eliminar</button>
                <button onClick={()=>{ setEditEvento(verEvento); setVerEvento(null); }} style={{ background:"#fff8f5", border:"1.5px solid #e65100", color:"#e65100", padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>✏️ Editar</button>
                <button onClick={()=>setVerEvento(null)} style={{ background:"#e65100", color:"#fff", border:"none", padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Modal Nuevo/Editar Evento ─────────────────────────────────────────────
function ModalEvento({ evento, onClose, showToast, fechaInicial }) {
  const [form, setForm] = useState(evento || { titulo:"", tipo:"recordatorio", fecha:fechaInicial||"", hora:"", descripcion:"", notificar:true });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.fecha) { showToast("Completá título y fecha","error"); return; }
    setSaving(true);
    if (evento?.fireId) {
      await updateDoc(doc(db,"eventos",evento.fireId), form);
      showToast("Evento actualizado ✅");
    } else {
      await addDoc(collection(db,"eventos"), form);
      showToast("Evento creado ✅");
    }
    setSaving(false);
    onClose();
  };

  const inp = { width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"#1a2340", outline:"none", boxSizing:"border-box" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", width:460, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#1a2340", marginBottom:20 }}>{evento?"✏️ Editar Evento":"➕ Nuevo Evento"}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Título *</label>
            <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Ej: Pagar factura proveedor" style={inp}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Tipo</label>
              <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={{ ...inp, cursor:"pointer" }}>
                {Object.entries(TIPO_EVENTO).map(([k,t])=><option key={k} value={k}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Fecha *</label>
              <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} style={inp}/>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Hora</label>
              <input type="time" value={form.hora} onChange={e=>setForm(f=>({...f,hora:e.target.value}))} style={inp}/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, paddingTop:24 }}>
              <input type="checkbox" id="notif" checked={form.notificar} onChange={e=>setForm(f=>({...f,notificar:e.target.checked}))} style={{ width:18, height:18, cursor:"pointer" }}/>
              <label htmlFor="notif" style={{ fontSize:13, fontWeight:600, color:"#4a5568", cursor:"pointer" }}>🔔 Notificarme</label>
            </div>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Descripción / Notas</label>
            <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} placeholder="Detalles opcionales..." rows={3}
              style={{ ...inp, resize:"vertical" }}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
          <button onClick={onClose} style={{ padding:"10px 20px", background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding:"10px 24px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>
            {saving?"Guardando...":"✅ Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Proveedores ───────────────────────────────────────────────
function ProveedoresView({ view, setView, showToast }) {
  const [proveedores, setProveedores] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [busq, setBusq]               = useState("");
  const [editingId, setEditingId]     = useState(null);
  const [tabProv, setTabProv]         = useState("proveedores"); // proveedores | compras

  useEffect(() => {
    const unsub = onSnapshot(collection(db,"proveedores"), snap => {
      setProveedores(snap.docs.map(d=>({...d.data(),fireId:d.id})));
    });
    return () => unsub();
  }, []);

  const filtrados = proveedores.filter(p => {
    const q = busq.toLowerCase();
    return !busq || `${p.empresa||""} ${p.titular||""} ${p.telefono||""}`.toLowerCase().includes(q);
  });

  const handleDelete = async (p) => {
    if (!window.confirm(`¿Eliminar proveedor "${p.empresa||p.titular}"?`)) return;
    await deleteDoc(doc(db,"proveedores",p.fireId));
    setSelected(null);
    showToast("Proveedor eliminado","error");
  };

  // ── Vista detalle proveedor ──
  if (selected && view==="proveedores") {
    const prov = proveedores.find(p=>p.fireId===selected);
    if (!prov) { setSelected(null); return null; }
    return <ProveedorDetalle prov={prov} setSelected={setSelected} setEditingId={setEditingId} setView={setView} handleDelete={handleDelete} showToast={showToast}/>;
  }

  // ── Formulario nuevo/editar ──
  if (view==="nuevoProveedor"||view==="editarProveedor") {
    const provExistente = editingId ? proveedores.find(p=>p.fireId===editingId) : null;
    return <FormularioProveedor prov={provExistente} setView={setView} setSelected={setSelected} showToast={showToast}/>;
  }

  return (
    <div>
      {/* Tabs principales */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", gap:8 }}>
          {[["proveedores","🏭 Proveedores"],["compras","🛒 Lista de Compras"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTabProv(t)}
              style={{ padding:"9px 20px", borderRadius:20, fontSize:14, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif",
                background:tabProv===t?"#e65100":"#fff", color:tabProv===t?"#fff":"#4a5568",
                boxShadow:tabProv===t?"0 3px 10px rgba(230,81,0,.2)":"0 1px 6px rgba(230,81,0,.07)" }}>
              {l}
            </button>
          ))}
        </div>
        {tabProv==="proveedores" && (
          <button onClick={()=>{ setEditingId(null); setView("nuevoProveedor"); }}
            style={{ background:"#e65100", color:"#fff", border:"none", padding:"10px 22px", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>
            ➕ Nuevo Proveedor
          </button>
        )}
      </div>

      {/* ── TAB: PROVEEDORES ── */}
      {tabProv==="proveedores" && (
        <div>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"14px 18px", marginBottom:18 }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }}>🔍</span>
              <input placeholder="Buscar proveedor..." value={busq} onChange={e=>setBusq(e.target.value)}
                style={{ width:"100%", padding:"10px 14px 10px 32px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
            </div>
          </div>

          {filtrados.length===0 ? (
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"52px", textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:14 }}>🏭</div>
              <div style={{ fontWeight:700, fontSize:18, fontFamily:"'DM Sans',sans-serif", marginBottom:6 }}>{busq?"Sin resultados":"No hay proveedores"}</div>
              <div style={{ color:"#a09080" }}>Agregá tu primer proveedor</div>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
              {filtrados.map(p=>(
                <div key={p.fireId} onClick={()=>setSelected(p.fireId)}
                  style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"20px", cursor:"pointer", borderTop:"3px solid #e65100", transition:"all .15s" }}
                  onMouseOver={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(230,81,0,.15)"}
                  onMouseOut={e=>e.currentTarget.style.boxShadow="0 2px 14px rgba(230,81,0,.07)"}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:17, fontWeight:700, color:"#1a2340", marginBottom:4 }}>{p.empresa||"Sin nombre"}</div>
                  {p.titular && <div style={{ fontSize:13, color:"#a09080", marginBottom:8 }}>👤 {p.titular}</div>}
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {p.telefono && <div style={{ fontSize:12, fontWeight:700, color:"#e65100" }}>📞 {p.telefono}</div>}
                    {p.mail     && <div style={{ fontSize:12, color:"#4a5568" }}>✉️ {p.mail}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: LISTA DE COMPRAS ── */}
      {tabProv==="compras" && (
        <ListaComprasView proveedores={proveedores} showToast={showToast}/>
      )}
    </div>
  );
}

// ── Lista de Compras Global ───────────────────────────────────────────────
function ListaComprasView({ proveedores, showToast }) {
  const [items, setItems]         = useState([]);
  const [modalItem, setModalItem] = useState(null); // null | {} | item existente
  const [filtroProv, setFiltroProv] = useState("todos");
  const [filtroEstado, setFiltroEst] = useState("pendiente");

  useEffect(() => {
    const unsub = onSnapshot(collection(db,"listaCompras"), snap => {
      setItems(snap.docs.map(d=>({...d.data(),fireId:d.id}))
        .sort((a,b)=>b.fecha?.localeCompare(a.fecha||"")||0));
    });
    return () => unsub();
  }, []);

  const filtrados = items.filter(i => {
    const matchProv  = filtroProv==="todos" || i.proveedorId===filtroProv;
    const matchEst   = filtroEstado==="todos" || i.estado===filtroEstado;
    return matchProv && matchEst;
  });

  const totalPendiente = filtrados.filter(i=>i.estado==="pendiente")
    .reduce((s,i)=>s+(parseFloat(i.precioInd||0)*parseInt(i.cantidad||1)),0);

  const marcarConseguido = async (item) => {
    await updateDoc(doc(db,"listaCompras",item.fireId),{estado:"conseguido",fechaConseguido:new Date().toISOString().split("T")[0]});
    showToast(`"${item.detalle}" marcado como conseguido ✅`);
  };

  const eliminar = async (item) => {
    await deleteDoc(doc(db,"listaCompras",item.fireId));
    showToast("Item eliminado","error");
  };

  const inp = {padding:"9px 12px",borderRadius:8,border:"1.5px solid #f0d5c0",fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none",boxSizing:"border-box",width:"100%"};

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h3 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#1a2340" }}>🛒 Lista de Compras</h3>
          <p style={{ fontSize:13, color:"#a09080", marginTop:3 }}>
            {filtrados.filter(i=>i.estado==="pendiente").length} pendiente{filtrados.filter(i=>i.estado==="pendiente").length!==1?"s":""} · Total: <strong style={{color:"#e65100"}}>${totalPendiente.toLocaleString("es-AR")}</strong>
          </p>
        </div>
        <button onClick={()=>setModalItem({})}
          style={{ background:"#e65100", color:"#fff", border:"none", padding:"10px 20px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
          ➕ Agregar Item
        </button>
      </div>

      {/* Filtros */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"14px 18px", marginBottom:18, display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
        <select value={filtroProv} onChange={e=>setFiltroProv(e.target.value)}
          style={{ ...inp, width:"auto", minWidth:180, cursor:"pointer" }}>
          <option value="todos">Todos los proveedores</option>
          {proveedores.map(p=><option key={p.fireId} value={p.fireId}>{p.empresa||p.titular}</option>)}
        </select>
        <div style={{ display:"flex", gap:6 }}>
          {[["pendiente","⏳ Pendientes"],["conseguido","✅ Conseguidos"],["todos","Todos"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFiltroEst(v)}
              style={{ padding:"7px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", border:"none",
                background:filtroEstado===v?"#e65100":"#fff8f5", color:filtroEstado===v?"#fff":"#a09080" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {filtrados.length===0 ? (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"52px", textAlign:"center", color:"#a09080" }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🛒</div>
          <div style={{ fontWeight:700, fontSize:16, fontFamily:"'DM Sans',sans-serif" }}>Sin items en la lista</div>
          <div style={{ fontSize:13, marginTop:6 }}>Agregá lo que necesitás comprar</div>
        </div>
      ) : (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            <thead>
              <tr style={{ background:"#fffaf7" }}>
                {["Cant.","Detalle","Proveedor","P. Individual","P. Total","Estado",""].map(h=>(
                  <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", borderBottom:"1px solid #f5e8e0", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(item => {
                const prov = proveedores.find(p=>p.fireId===item.proveedorId);
                const cant = parseInt(item.cantidad||1);
                const pInd = parseFloat(item.precioInd||0);
                const pTot = cant * pInd;
                const conseguido = item.estado==="conseguido";
                return (
                  <tr key={item.fireId} style={{ borderBottom:"1px solid #fef0e8", opacity:conseguido?.6:1, background:conseguido?"#fffaf7":"#fff" }}>
                    <td style={{ padding:"12px 14px", fontWeight:700, color:"#e65100", fontSize:15 }}>{cant}</td>
                    <td style={{ padding:"12px 14px", color:"#1a2340", fontWeight:600 }}>
                      <div style={{ textDecoration:conseguido?"line-through":"none" }}>{item.detalle}</div>
                      {item.notas && <div style={{ fontSize:11, color:"#a09080", marginTop:2 }}>{item.notas}</div>}
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      {prov
                        ? <span style={{ background:"#fff3e0", color:"#e65100", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{prov.empresa||prov.titular}</span>
                        : <span style={{ color:"#a09080", fontSize:12 }}>Sin asignar</span>
                      }
                    </td>
                    <td style={{ padding:"12px 14px", color:"#4a5568" }}>{pInd>0?`$${pInd.toLocaleString("es-AR")}`:"—"}</td>
                    <td style={{ padding:"12px 14px", fontWeight:700, color:pTot>0?"#1a2340":"#a09080" }}>{pTot>0?`$${pTot.toLocaleString("es-AR")}`:"—"}</td>
                    <td style={{ padding:"12px 14px" }}>
                      {conseguido
                        ? <span style={{ background:"#e8f5e9", color:"#2e7d32", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600 }}>✅ Conseguido</span>
                        : <span style={{ background:"#fff3e0", color:"#e65100", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600 }}>⏳ Pendiente</span>
                      }
                    </td>
                    <td style={{ padding:"12px 12px" }}>
                      <div style={{ display:"flex", gap:5 }}>
                        {!conseguido && (
                          <button onClick={()=>marcarConseguido(item)}
                            style={{ background:"#e8f5e9", border:"none", color:"#2e7d32", padding:"5px 9px", borderRadius:6, fontSize:13, cursor:"pointer", fontWeight:700 }} title="Marcar conseguido">
                            ✓
                          </button>
                        )}
                        <button onClick={()=>setModalItem(item)}
                          style={{ background:"#fff8f5", border:"1.5px solid #e65100", color:"#e65100", padding:"5px 8px", borderRadius:6, fontSize:12, cursor:"pointer" }}>✏️</button>
                        <button onClick={()=>eliminar(item)}
                          style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"5px 8px", borderRadius:6, fontSize:12, cursor:"pointer" }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {totalPendiente > 0 && (
              <tfoot>
                <tr style={{ background:"#fff8f5", borderTop:"2px solid #f0d5c0" }}>
                  <td colSpan={4} style={{ padding:"12px 14px", fontWeight:700, color:"#a09080", fontSize:13 }}>TOTAL PENDIENTE</td>
                  <td style={{ padding:"12px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:"#e65100" }}>${totalPendiente.toLocaleString("es-AR")}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Modal agregar/editar item */}
      {modalItem && (
        <ModalItemCompra
          item={modalItem.fireId ? modalItem : null}
          proveedores={proveedores}
          onClose={()=>setModalItem(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ── Modal Item de Compra ──────────────────────────────────────────────────
function ModalItemCompra({ item, proveedores, onClose, showToast }) {
  const [form, setForm] = useState(item || { cantidad:1, detalle:"", proveedorId:"", precioInd:"", notas:"", estado:"pendiente" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.detalle.trim()) { showToast("El detalle es obligatorio","error"); return; }
    setSaving(true);
    const data = { ...form, cantidad:parseInt(form.cantidad)||1, precioInd:parseFloat(form.precioInd)||0, fecha:form.fecha||new Date().toISOString().split("T")[0] };
    if (item?.fireId) {
      await updateDoc(doc(db,"listaCompras",item.fireId), data);
      showToast("Item actualizado ✅");
    } else {
      await addDoc(collection(db,"listaCompras"), data);
      showToast("Item agregado a la lista ✅");
    }
    setSaving(false);
    onClose();
  };

  const inp = { width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", width:500, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#1a2340", marginBottom:20 }}>
          {item?.fireId?"✏️ Editar Item":"➕ Nuevo Item de Compra"}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ gridColumn:"1 / -1" }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Detalle *</label>
            <input value={form.detalle} onChange={e=>setForm(f=>({...f,detalle:e.target.value}))} placeholder="Ej: Vinilo base blanca 1.52m" style={inp}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Cantidad</label>
            <input type="number" min="1" value={form.cantidad} onChange={e=>setForm(f=>({...f,cantidad:e.target.value}))} style={inp}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Precio Individual ($)</label>
            <input type="number" value={form.precioInd} onChange={e=>setForm(f=>({...f,precioInd:e.target.value}))} placeholder="0" style={inp}/>
          </div>
          <div style={{ gridColumn:"1 / -1" }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Proveedor</label>
            <select value={form.proveedorId||""} onChange={e=>setForm(f=>({...f,proveedorId:e.target.value}))} style={{ ...inp, cursor:"pointer" }}>
              <option value="">Sin asignar</option>
              {proveedores.map(p=><option key={p.fireId} value={p.fireId}>{p.empresa||p.titular}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:"1 / -1" }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Notas (opcional)</label>
            <input value={form.notas||""} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} placeholder="Medida, color, especificaciones..." style={inp}/>
          </div>
          {form.precioInd > 0 && form.cantidad > 0 && (
            <div style={{ gridColumn:"1 / -1", background:"#fff8f5", borderRadius:8, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:13, color:"#a09080", fontWeight:600 }}>Total estimado:</span>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#e65100" }}>
                ${(parseFloat(form.precioInd||0)*parseInt(form.cantidad||1)).toLocaleString("es-AR")}
              </span>
            </div>
          )}
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
          <button onClick={onClose} style={{ padding:"9px 18px", background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:"9px 22px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {saving?"Guardando...":"✅ Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detalle Proveedor ─────────────────────────────────────────────────────
function ProveedorDetalle({ prov, setSelected, setEditingId, setView, handleDelete, showToast }) {
  const [pedidoModal, setPedidoModal]   = useState(false);
  const [pedidosList, setPedidosList]   = useState([]);
  const [facturas, setFacturas]         = useState([]);
  const [tabActiva, setTabActiva]       = useState("pedidos");
  const [nuevoPedItem, setNuevoPedItem] = useState("");

  useEffect(() => {
    const u1 = onSnapshot(collection(db,"pedidosProveedor"), snap => {
      setPedidosList(snap.docs.map(d=>({...d.data(),fireId:d.id})).filter(p=>p.proveedorId===prov.fireId));
    });
    const u2 = onSnapshot(collection(db,"facturasProveedor"), snap => {
      setFacturas(snap.docs.map(d=>({...d.data(),fireId:d.id})).filter(f=>f.proveedorId===prov.fireId).sort((a,b)=>b.fecha?.localeCompare(a.fecha||"")||0));
    });
    return () => { u1(); u2(); };
  }, [prov.fireId]);

  const pendientes  = pedidosList.filter(p=>!p.conseguido);
  const conseguidos = pedidosList.filter(p=>p.conseguido);

  const agregarItem = async () => {
    if (!nuevoPedItem.trim()) return;
    await addDoc(collection(db,"pedidosProveedor"), { proveedorId:prov.fireId, item:nuevoPedItem.trim(), conseguido:false, fecha:new Date().toISOString().split("T")[0] });
    setNuevoPedItem("");
  };

  const marcarConseguido = async (p) => {
    await updateDoc(doc(db,"pedidosProveedor",p.fireId), { conseguido:true, fechaConseguido:new Date().toISOString().split("T")[0] });
    showToast(`"${p.item}" marcado como conseguido ✅`);
  };

  const eliminarItem = async (p) => {
    await deleteDoc(doc(db,"pedidosProveedor",p.fireId));
  };

  const subirFactura = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await addDoc(collection(db,"facturasProveedor"), {
        proveedorId: prov.fireId,
        fecha:       new Date().toISOString().split("T")[0],
        nombre:      file.name,
        imagen:      ev.target.result,
      });
      showToast("Factura guardada ✅");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <button onClick={()=>setSelected(null)} style={{ background:"transparent", border:"none", color:"#e65100", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>← Volver a proveedores</button>

      {/* Ficha */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"24px 28px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:24, fontWeight:700, color:"#1a2340", marginBottom:4 }}>{prov.empresa||"Sin nombre"}</div>
          {prov.titular   && <div style={{ fontSize:13, color:"#a09080", marginBottom:8 }}>👤 {prov.titular}</div>}
          <div style={{ display:"flex", flexWrap:"wrap", gap:16 }}>
            {prov.cuit      && <span style={{ fontSize:13 }}>🪪 {prov.cuit}</span>}
            {prov.telefono  && <span style={{ fontSize:13, fontWeight:700, color:"#e65100" }}>📞 {prov.telefono}</span>}
            {prov.mail      && <span style={{ fontSize:13 }}>✉️ {prov.mail}</span>}
            {prov.direccion && <span style={{ fontSize:13 }}>📍 {prov.direccion}</span>}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>{ setEditingId(prov.fireId); setView("editarProveedor"); }}
            style={{ background:"#fff8f5", border:"1.5px solid #e65100", color:"#e65100", padding:"7px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>✏️ Editar</button>
          <button onClick={()=>handleDelete(prov)}
            style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"7px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>🗑</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["pedidos","📋 Lista de pedidos"],["facturas","🧾 Facturas"],["historial","📦 Historial"]].map(([tab,lbl])=>(
          <button key={tab} onClick={()=>setTabActiva(tab)}
            style={{ padding:"8px 18px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif",
              background:tabActiva===tab?"#e65100":"#fff", color:tabActiva===tab?"#fff":"#4a5568",
              boxShadow:tabActiva===tab?"0 3px 10px rgba(230,81,0,.2)":"0 1px 6px rgba(230,81,0,.07)" }}>
            {lbl} {tab==="pedidos"&&pendientes.length>0&&<span style={{ background:tabActiva===tab?"rgba(255,255,255,.3)":"#fff3e0", color:tabActiva===tab?"#fff":"#e65100", borderRadius:10, padding:"0 6px", fontSize:11, fontWeight:700 }}>{pendientes.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab: Lista de pedidos */}
      {tabActiva==="pedidos" && (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"20px 24px" }}>
          <div style={{ fontWeight:700, fontSize:15, color:"#1a2340", marginBottom:14 }}>📋 Cosas para pedir</div>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <input value={nuevoPedItem} onChange={e=>setNuevoPedItem(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&agregarItem()}
              placeholder="Ej: Papel A4 120g, Vinilo blanco 1.52m..."
              style={{ flex:1, padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none" }}/>
            <button onClick={agregarItem} style={{ background:"#e65100", color:"#fff", border:"none", padding:"10px 20px", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>+ Agregar</button>
          </div>
          {pendientes.length===0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:"#d4bfb0", fontSize:13 }}>Sin pendientes — todo en orden 🎉</div>
          ) : pendientes.map(p=>(
            <div key={p.fireId} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #fef0e8" }}>
              <button onClick={()=>marcarConseguido(p)} style={{ width:22, height:22, borderRadius:5, border:"2px solid #e65100", background:"#fff", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✓</button>
              <span style={{ flex:1, fontSize:14, color:"#1a2340", fontWeight:500 }}>{p.item}</span>
              <span style={{ fontSize:11, color:"#a09080" }}>{p.fecha}</span>
              <button onClick={()=>eliminarItem(p)} style={{ background:"transparent", border:"none", color:"#c62828", cursor:"pointer", fontSize:14 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Facturas */}
      {tabActiva==="facturas" && (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"20px 24px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:15, color:"#1a2340" }}>🧾 Facturas ({facturas.length})</div>
            <label style={{ background:"#e65100", color:"#fff", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              📷 Subir factura
              <input type="file" accept="image/*,application/pdf" onChange={subirFactura} style={{ display:"none" }}/>
            </label>
          </div>
          {facturas.length===0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:"#d4bfb0", fontSize:13 }}>Sin facturas cargadas</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
              {facturas.map(f=>(
                <div key={f.fireId} style={{ borderRadius:10, border:"1.5px solid #f0d5c0", overflow:"hidden", cursor:"pointer" }}
                  onClick={()=>window.open(f.imagen,"_blank")}>
                  <img src={f.imagen} alt={f.nombre} style={{ width:"100%", height:120, objectFit:"cover" }}/>
                  <div style={{ padding:"8px 10px", background:"#fffaf7" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#1a2340", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.nombre}</div>
                    <div style={{ fontSize:10, color:"#a09080", marginTop:2 }}>{f.fecha}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Historial */}
      {tabActiva==="historial" && (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"20px 24px" }}>
          <div style={{ fontWeight:700, fontSize:15, color:"#1a2340", marginBottom:14 }}>📦 Historial de pedidos conseguidos ({conseguidos.length})</div>
          {conseguidos.length===0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:"#d4bfb0", fontSize:13 }}>Sin historial aún</div>
          ) : conseguidos.sort((a,b)=>b.fechaConseguido?.localeCompare(a.fechaConseguido||"")||0).map(p=>(
            <div key={p.fireId} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #fef0e8" }}>
              <span style={{ fontSize:16 }}>✅</span>
              <span style={{ flex:1, fontSize:14, color:"#4a5568", textDecoration:"line-through" }}>{p.item}</span>
              <div style={{ textAlign:"right", fontSize:11, color:"#a09080" }}>
                <div>Pedido: {p.fecha}</div>
                <div>Conseguido: {p.fechaConseguido||"—"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Formulario Proveedor ──────────────────────────────────────────────────
function FormularioProveedor({ prov, setView, setSelected, showToast }) {
  const [form, setForm]     = useState(prov || { empresa:"", titular:"", cuit:"", direccion:"", telefono:"", mail:"" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.empresa?.trim() && !form.titular?.trim()) { showToast("Ingresá al menos empresa o titular","error"); return; }
    setSaving(true);
    if (prov?.fireId) {
      await updateDoc(doc(db,"proveedores",prov.fireId), form);
      showToast("Proveedor actualizado ✅");
      setSelected(prov.fireId);
    } else {
      const ref = await addDoc(collection(db,"proveedores"), form);
      showToast("Proveedor creado ✅");
      setSelected(ref.id);
    }
    setSaving(false);
    setView("proveedores");
  };

  const inp = { width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"#1a2340", outline:"none", boxSizing:"border-box" };

  return (
    <div>
      <button onClick={()=>setView("proveedores")} style={{ background:"transparent", border:"none", color:"#e65100", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>← Volver</button>
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"32px 36px" }}>
        <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:24, fontWeight:700, color:"#1a2340", marginBottom:4 }}>{prov?"✏️ Editar Proveedor":"➕ Nuevo Proveedor"}</h2>
        <p style={{ fontSize:14, color:"#a09080", marginBottom:24 }}>Datos del proveedor.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
          <div style={{ gridColumn:"1 / -1" }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Empresa / Nombre comercial *</label>
            <input value={form.empresa} onChange={e=>setForm(f=>({...f,empresa:e.target.value}))} placeholder="Ej: Distribuidora Sur" style={inp}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Titular / Contacto</label>
            <input value={form.titular} onChange={e=>setForm(f=>({...f,titular:e.target.value}))} placeholder="Nombre y apellido" style={inp}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>CUIT</label>
            <input value={form.cuit} onChange={e=>setForm(f=>({...f,cuit:e.target.value}))} placeholder="XX-XXXXXXXX-X" style={inp}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Teléfono</label>
            <input value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} placeholder="11-xxxx-xxxx" style={inp}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Mail</label>
            <input value={form.mail} onChange={e=>setForm(f=>({...f,mail:e.target.value}))} placeholder="proveedor@mail.com" style={inp}/>
          </div>
          <div style={{ gridColumn:"1 / -1" }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Dirección</label>
            <input value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))} placeholder="Calle, número, ciudad" style={inp}/>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:28 }}>
          <button onClick={()=>setView("proveedores")} style={{ padding:"10px 22px", background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:"10px 28px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", opacity:saving?.7:1 }}>
            {saving?"Guardando...":prov?"💾 Guardar Cambios":"✅ Crear Proveedor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Historial de Ventas ───────────────────────────────────────
function VentasView({ setView, showToast, clientes, empresa, configCargada }) {
  const [ventas, setVentas]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busq, setBusq]         = useState("");
  const [filtroFecha, setFiltroFecha] = useState("hoy");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "ventas"), snap => {
      const data = snap.docs.map(d=>({...d.data(), fireId:d.id}))
        .sort((a,b)=>b.fecha?.localeCompare(a.fecha||"")||0);
      setVentas(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const hoy = new Date().toISOString().split("T")[0];
  const filtradas = ventas.filter(v => {
    const q = busq.toLowerCase();
    const matchBusq = !busq || v.clienteNombre?.toLowerCase().includes(q) || v.numero?.toString().includes(q);
    if (filtroFecha==="hoy")   return matchBusq && v.fecha===hoy;
    if (filtroFecha==="semana") {
      const d = new Date(); d.setDate(d.getDate()-7);
      return matchBusq && v.fecha >= d.toISOString().split("T")[0];
    }
    if (filtroFecha==="mes") {
      return matchBusq && v.fecha?.startsWith(hoy.slice(0,7));
    }
    return matchBusq;
  });

  const totalFiltrado = filtradas.reduce((s,v)=>s+parseFloat(v.total||0),0);
  const totalEfectivo = filtradas.filter(v=>v.metodoPago==="Efectivo").reduce((s,v)=>s+parseFloat(v.total||0),0);
  const totalTransfer = filtradas.filter(v=>v.metodoPago==="Transferencia").reduce((s,v)=>s+parseFloat(v.total||0),0);
  const totalCtaCte   = filtradas.filter(v=>v.metodoPago==="Cuenta Corriente").reduce((s,v)=>s+parseFloat(v.total||0),0);

  const handleDelete = async (v) => {
    if (!window.confirm("¿Eliminar esta venta?")) return;
    await deleteDoc(doc(db, "ventas", v.fireId));
    showToast("Venta eliminada", "error");
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:"#1a2340" }}>💰 Ventas</h2>
          <p style={{ fontSize:14, color:"#a09080", marginTop:4 }}>{filtradas.length} venta{filtradas.length!==1?"s":""} · Total: <strong style={{color:"#e65100"}}>${totalFiltrado.toLocaleString("es-AR")}</strong></p>
        </div>
        <button onClick={() => setView("nuevaVenta")}
          style={{ background:"#e65100", color:"#fff", border:"none", padding:"10px 22px", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
          ➕ Nueva Venta
        </button>
      </div>

      {/* Stats rápidos */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Total", value:`$${totalFiltrado.toLocaleString("es-AR")}`, color:"#e65100" },
          { label:"Efectivo", value:`$${totalEfectivo.toLocaleString("es-AR")}`, color:"#2e7d32" },
          { label:"Transferencia", value:`$${totalTransfer.toLocaleString("es-AR")}`, color:"#1565c0" },
          { label:"Cta. Corriente", value:`$${totalCtaCte.toLocaleString("es-AR")}`, color:"#6a1b9a" },
        ].map((s,i) => (
          <div key={i} style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"14px 18px" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"14px 18px", marginBottom:18, display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:"1 1 200px" }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }}>🔍</span>
          <input placeholder="Buscar por cliente o número..." value={busq} onChange={e=>setBusq(e.target.value)}
            style={{ width:"100%", padding:"10px 14px 10px 32px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
        </div>
        {["hoy","semana","mes","todos"].map(f => (
          <button key={f} onClick={() => setFiltroFecha(f)}
            style={{ padding:"8px 16px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif",
              background:filtroFecha===f?"#e65100":"#fff8f5", color:filtroFecha===f?"#fff":"#a09080",
              boxShadow:filtroFecha===f?"0 3px 10px rgba(230,81,0,.2)":"none" }}>
            {f==="hoy"?"Hoy":f==="semana"?"Esta semana":f==="mes"?"Este mes":"Todas"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#a09080" }}>Cargando ventas...</div>
      ) : filtradas.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"52px 24px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:14 }}>💰</div>
          <div style={{ fontWeight:700, fontSize:18, fontFamily:"'DM Sans',sans-serif", marginBottom:6 }}>Sin ventas {filtroFecha==="hoy"?"hoy":filtroFecha==="semana"?"esta semana":filtroFecha==="mes"?"este mes":""}</div>
          <div style={{ color:"#a09080", fontSize:14 }}>Registrá una nueva venta con el botón de arriba</div>
        </div>
      ) : (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            <thead>
              <tr style={{ background:"#fffaf7" }}>
                {["N°","Fecha","Cliente","Items","Método de Pago","Total",""].map(h=>(
                  <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", borderBottom:"1px solid #f5e8e0", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(v => {
                const mpColor = v.metodoPago==="Efectivo"?"#2e7d32":v.metodoPago==="Transferencia"?"#1565c0":v.metodoPago==="Cuenta Corriente"?"#6a1b9a":"#e65100";
                const mpBg    = v.metodoPago==="Efectivo"?"#e8f5e9":v.metodoPago==="Transferencia"?"#e3f2fd":v.metodoPago==="Cuenta Corriente"?"#f3e5f5":"#fff3e0";
                return (
                  <tr key={v.fireId} style={{ borderBottom:"1px solid #fef0e8" }}>
                    <td style={{ padding:"12px 16px", fontFamily:"monospace", color:"#a09080", fontSize:12 }}>X-{String(v.numero||1).padStart(5,"0")}</td>
                    <td style={{ padding:"12px 16px", color:"#4a5568" }}>{v.fecha||"—"}</td>
                    <td style={{ padding:"12px 16px", fontWeight:600, color:"#1a2340" }}>{v.clienteNombre||"Consumidor Final"}</td>
                    <td style={{ padding:"12px 16px", color:"#4a5568" }}>{v.items?.length||0} producto{v.items?.length!==1?"s":""}</td>
                    <td style={{ padding:"12px 16px" }}>
                      <span style={{ background:mpBg, color:mpColor, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{v.metodoPago||"—"}</span>
                    </td>
                    <td style={{ padding:"12px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:700, color:"#e65100" }}>${parseFloat(v.total||0).toLocaleString("es-AR")}</td>
                    <td style={{ padding:"12px 14px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => imprimirComprobante(v, empresa)}
                          style={{ background: configCargada?"#e65100":"#ccc", color:"#fff", border:"none", padding:"5px 10px", borderRadius:6, fontSize:12, cursor: configCargada?"pointer":"not-allowed", fontWeight:600 }} title={configCargada?"Imprimir comprobante":"Cargando configuración..."}>🖨️</button>
                        <button onClick={() => handleDelete(v)}
                          style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"5px 10px", borderRadius:6, fontSize:12, cursor:"pointer" }}>🗑</button>
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
}

// ── Componente: Nueva Venta ───────────────────────────────────────────────
function NuevaVentaView({ setView, showToast, clientes, empresa, configCargada }) {
  const [insumos, setInsumos]           = useState([]);
  const [items, setItems]               = useState([]);
  const [busqProd, setBusqProd]         = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const [clienteSelId, setClienteSelId] = useState(null);
  const [clienteNombre, setClienteNombre] = useState("");
  const [metodoPago, setMetodoPago]     = useState("Efectivo");
  const [saving, setSaving]             = useState(false);
  const [tipoPrecios, setTipoPrecios]   = useState("venta"); // venta | gremio

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), snap => {
      setInsumos(snap.docs.map(d=>({...d.data(), fireId:d.id})));
    });
    return () => unsub();
  }, []);

  const prodFiltrados = insumos.filter(i => {
    if (!busqProd) return true;
    const palabras = busqProd.toLowerCase().split(/\s+/).filter(Boolean);
    const texto = `${i.nombre||""} ${i.codigo||""} ${i.categoria||""}`.toLowerCase();
    return palabras.every(p => texto.includes(p));
  }).slice(0,80);

  const agregarItem = (ins) => {
    setItems(prev => {
      const existe = prev.find(it => it.insumoId === ins.fireId);
      if (existe) return prev.map(it => it.insumoId===ins.fireId ? {...it, cantidad:it.cantidad+1} : it);
      const precio = tipoPrecios==="gremio" ? (parseFloat(ins.precioGremio)||parseFloat(ins.precioVenta)||0) : (parseFloat(ins.precioVenta)||0);
      return [...prev, { insumoId:ins.fireId, codigo:ins.codigo||"", nombre:ins.nombre, precio, cantidad:1, stockDisp:parseFloat(ins.stock)||0 }];
    });
  };

  const updateCantidad = (insumoId, val) => {
    const n = Math.max(1, parseInt(val)||1);
    setItems(prev => prev.map(it => it.insumoId===insumoId ? {...it, cantidad:n} : it));
  };

  const removeItem = (insumoId) => setItems(prev => prev.filter(it => it.insumoId!==insumoId));

  const total = items.reduce((s,it)=>s+it.cantidad*it.precio, 0);

  const handleGuardar = async () => {
    if (items.length===0) { showToast("Agregá al menos un producto", "error"); return; }
    setSaving(true);
    try {
      // Obtener número correlativo
      const ventasSnap = await import("firebase/firestore").then(m =>
        m.getDocs(m.collection(db, "ventas"))
      );
      const numero = ventasSnap.size + 1;

      // Guardar venta
      const venta = {
        numero,
        fecha:         new Date().toISOString().split("T")[0],
        clienteId:     clienteSelId||null,
        clienteNombre: clienteNombre||"Consumidor Final",
        metodoPago,
        items,
        total,
        creadoEn:      new Date().toISOString(),
      };
      await addDoc(collection(db, "ventas"), venta);

      // Descontar stock de cada insumo
      for (const it of items) {
        const ins = insumos.find(i => i.fireId===it.insumoId);
        if (ins) {
          const nuevoStock = Math.max(0, (parseFloat(ins.stock)||0) - it.cantidad);
          await updateDoc(doc(db, "insumos", ins.fireId), { stock: nuevoStock });
        }
      }

      // Si es cuenta corriente, sumar al saldo del cliente
      if (metodoPago==="Cuenta Corriente" && clienteSelId) {
        const cl = clientes.find(c=>c.fireId===clienteSelId);
        if (cl) {
          const nuevoSaldo = (parseFloat(cl.saldoCuenta)||0) + total;
          await updateDoc(doc(db, "clientes", clienteSelId), { saldoCuenta: nuevoSaldo });
          await addDoc(collection(db, "movimientosCuenta"), {
            clienteId: clienteSelId,
            tipo: "cargo",
            monto: total,
            fecha: new Date().toISOString().split("T")[0],
            descripcion: `Venta X-${String(numero).padStart(5,"0")}`
          });
        }
      }

      showToast(`Venta registrada ✅ · $${total.toLocaleString("es-AR")}`);

      // Imprimir comprobante
      setTimeout(() => imprimirComprobante(venta, empresa), 400);
      setView("ventas");
    } catch(e) {
      console.error(e);
      showToast("Error al guardar la venta", "error");
    }
    setSaving(false);
  };

  return (
    <div>
      <button onClick={() => setView("ventas")} style={{ background:"transparent", border:"none", color:"#e65100", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>← Volver</button>

      <div className="grid-nueva-venta">

        {/* ── Columna izquierda: productos ── */}
        <div>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"20px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:15, color:"#1a2340" }}>🔍 Productos</div>
              <div style={{ display:"flex", gap:6 }}>
                {[["venta","Precio Venta"],["gremio","Precio Gremio"]].map(([val,lbl]) => (
                  <button key={val} onClick={()=>setTipoPrecios(val)}
                    style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", border:"none",
                      background:tipoPrecios===val?"#e65100":"#fff8f5", color:tipoPrecios===val?"#fff":"#a09080" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <input placeholder="Buscar por nombre o código..." value={busqProd} onChange={e=>setBusqProd(e.target.value)}
              style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box", marginBottom:14 }}/>
            <div style={{ maxHeight:420, overflowY:"auto", display:"flex", flexDirection:"column", gap:6 }}>
              {prodFiltrados.length===0 ? (
                <div style={{ textAlign:"center", padding:"24px 0", color:"#a09080", fontSize:13 }}>Sin productos{busqProd?" con ese criterio":""}</div>
              ) : prodFiltrados.map(ins => {
                const precio = tipoPrecios==="gremio" ? (parseFloat(ins.precioGremio)||parseFloat(ins.precioVenta)||0) : (parseFloat(ins.precioVenta)||0);
                const enCarrito = items.find(it=>it.insumoId===ins.fireId);
                return (
                  <div key={ins.fireId} onClick={() => agregarItem(ins)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:9, border:`1.5px solid ${enCarrito?"#e65100":"#f0d5c0"}`, background:enCarrito?"#fff8f5":"#fff", cursor:"pointer", transition:"all .15s" }}
                    onMouseOver={e=>e.currentTarget.style.borderColor="#e65100"}
                    onMouseOut={e=>{ if(!enCarrito) e.currentTarget.style.borderColor="#f0d5c0"; }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:13, color:"#1a2340" }}>{ins.nombre}</div>
                      <div style={{ fontSize:11, color:"#a09080", marginTop:2 }}>{ins.codigo||""} {ins.categoria?`· ${ins.categoria}`:""} · Stock: {parseFloat(ins.stock)||0}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontWeight:700, color:"#e65100", fontSize:14 }}>${precio.toLocaleString("es-AR")}</span>
                      {enCarrito
                        ? <span style={{ background:"#e65100", color:"#fff", borderRadius:"50%", width:22, height:22, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700 }}>{enCarrito.cantidad}</span>
                        : <span style={{ color:"#e65100", fontSize:18, fontWeight:300 }}>+</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Columna derecha: carrito + datos ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Cliente */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"18px 20px" }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#1a2340", marginBottom:12 }}>👤 Cliente</div>
            {clienteSelId ? (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fff8f5", borderRadius:8, padding:"10px 14px", border:"1.5px solid #e65100" }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{clienteNombre}</div>
                <button onClick={() => { setClienteSelId(null); setClienteNombre(""); setClienteSearch(""); }}
                  style={{ background:"transparent", border:"none", color:"#c62828", cursor:"pointer", fontSize:16, fontWeight:700 }}>✕</button>
              </div>
            ) : (
              <div style={{ position:"relative" }}>
                <input value={clienteSearch} onChange={e=>{ setClienteSearch(e.target.value); setClienteDropdown(true); }} onFocus={()=>setClienteDropdown(true)}
                  placeholder="Consumidor Final (dejar vacío)"
                  style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
                {clienteDropdown && clienteSearch && (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1.5px solid #f0d5c0", borderRadius:8, boxShadow:"0 8px 24px rgba(230,81,0,.1)", zIndex:100, maxHeight:180, overflowY:"auto", marginTop:4 }}>
                    {clientes.filter(c=>`${c.nombre} ${c.apellido} ${c.empresa||""}`.toLowerCase().includes(clienteSearch.toLowerCase())).map(cl=>(
                      <div key={cl.fireId} onClick={()=>{ setClienteSelId(cl.fireId); setClienteNombre(`${cl.nombre} ${cl.apellido}`.trim()); setClienteDropdown(false); }}
                        style={{ padding:"9px 14px", cursor:"pointer", fontSize:13, fontWeight:600, borderBottom:"1px solid #fef0e8" }}
                        onMouseOver={e=>e.currentTarget.style.background="#fff8f5"}
                        onMouseOut={e=>e.currentTarget.style.background="#fff"}>
                        {cl.nombre} {cl.apellido} {cl.empresa&&`— ${cl.empresa}`}
                        {cl.saldoCuenta>0 && <span style={{ marginLeft:8, fontSize:11, color:"#c62828", fontWeight:700 }}>Debe ${parseFloat(cl.saldoCuenta).toLocaleString("es-AR")}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"18px 20px" }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#1a2340", marginBottom:12 }}>💳 Método de Pago</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {["Efectivo","Transferencia","Tarjeta de Crédito","Cuenta Corriente"].map(m=>(
                <button key={m} onClick={()=>setMetodoPago(m)}
                  style={{ padding:"10px 8px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", border:`2px solid ${metodoPago===m?"#e65100":"#f0d5c0"}`,
                    background:metodoPago===m?"#e65100":"#fff", color:metodoPago===m?"#fff":"#4a5568", transition:"all .15s" }}>
                  {m==="Efectivo"?"💵 Efectivo":m==="Transferencia"?"📲 Transferencia":m==="Tarjeta de Crédito"?"💳 Tarjeta":"📒 Cta. Corriente"}
                </button>
              ))}
            </div>
            {metodoPago==="Cuenta Corriente" && !clienteSelId && (
              <div style={{ marginTop:10, fontSize:12, color:"#c62828", background:"#ffebee", padding:"8px 12px", borderRadius:7 }}>
                ⚠️ Seleccioná un cliente para usar cuenta corriente
              </div>
            )}
          </div>

          {/* Carrito */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"18px 20px" }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#1a2340", marginBottom:12 }}>🛒 Carrito ({items.length})</div>
            {items.length===0 ? (
              <div style={{ textAlign:"center", padding:"20px 0", color:"#d4bfb0", fontSize:13 }}>Hacé clic en un producto para agregarlo</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
                {items.map(it=>(
                  <div key={it.insumoId} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:8, background:"#fffaf7", border:"1px solid #f5e8e0" }}>
                    <div style={{ flex:1, fontSize:12, fontWeight:600, color:"#1a2340", lineHeight:1.3 }}>{it.nombre}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <button onClick={()=>updateCantidad(it.insumoId,it.cantidad-1)} style={{ background:"#ffebee", border:"none", color:"#c62828", width:22, height:22, borderRadius:5, fontWeight:700, cursor:"pointer" }}>−</button>
                      <input type="number" value={it.cantidad} onChange={e=>updateCantidad(it.insumoId,e.target.value)}
                        style={{ width:40, textAlign:"center", border:"1.5px solid #f0d5c0", borderRadius:5, fontSize:13, fontWeight:700, padding:"2px 4px", fontFamily:"'DM Sans',sans-serif" }}/>
                      <button onClick={()=>updateCantidad(it.insumoId,it.cantidad+1)} style={{ background:"#e8f5e9", border:"none", color:"#2e7d32", width:22, height:22, borderRadius:5, fontWeight:700, cursor:"pointer" }}>+</button>
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#e65100", minWidth:70, textAlign:"right" }}>${(it.cantidad*it.precio).toLocaleString("es-AR")}</div>
                    <button onClick={()=>removeItem(it.insumoId)} style={{ background:"transparent", border:"none", color:"#c62828", cursor:"pointer", fontSize:14, fontWeight:700 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {/* Total */}
            <div style={{ borderTop:"2px solid #f5e8e0", paddingTop:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontWeight:700, fontSize:15, color:"#1a2340" }}>TOTAL</span>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:"#e65100" }}>${total.toLocaleString("es-AR")}</span>
              </div>
            </div>
          </div>

          {/* Botón confirmar */}
          <button onClick={handleGuardar} disabled={saving||items.length===0}
            style={{ width:"100%", padding:"15px", background: items.length===0?"#f0d5c0":"#e65100", color:"#fff", border:"none", borderRadius:10, fontSize:16, fontWeight:700, cursor:items.length===0?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all .2s" }}>
            {saving ? "Guardando..." : !configCargada ? "⏳ Cargando configuración..." : "✅ Confirmar Venta · Imprimir Comprobante"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Insumos ───────────────────────────────────────────────────
function InsumosView({ setView, showToast }) {
  const [insumos, setInsumos]         = useState([]);
  const [busq, setBusq]               = useState("");
  const [filtroCat, setFiltroCat]     = useState("Todas");
  const [importModal, setImportModal] = useState(false);
  const [importData, setImportData]   = useState([]);
  const [importing, setImporting]     = useState(false);
  const [modoImport, setModoImport]   = useState("reemplazar"); // reemplazar | agregar
  const [loadingInsumos, setLoadingInsumos] = useState(true);
  const [editingId, setEditingId]     = useState(null);
  const [editModal, setEditModal]     = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "insumos"), snap => {
      setInsumos(snap.docs.map(d => ({ ...d.data(), fireId: d.id })));
      setLoadingInsumos(false);
    });
    return () => unsub();
  }, []);

  const categorias = ["Todas", ...Array.from(new Set(insumos.map(i => i.categoria).filter(Boolean))).sort()];

  const filtrados = insumos.filter(i => {
    if (busq) {
      const palabras = busq.toLowerCase().split(/\s+/).filter(Boolean);
      const texto = `${i.nombre||""} ${i.codigo||""} ${i.categoria||""}`.toLowerCase();
      if (!palabras.every(p => texto.includes(p))) return false;
    }
    return filtroCat === "Todas" || i.categoria === filtroCat;
  }).sort((a,b) => (a.categoria||"").localeCompare(b.categoria||"") || (a.nombre||"").localeCompare(b.nombre||""));

  // ── Importar Excel ──
  const handleExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf);
    const ws   = wb.Sheets["Precios final"];
    if (!ws) { showToast('No encontré la pestaña "Precios final"', "error"); return; }
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const parsed = rows
      .filter(r => r.nombre || r.codigo)
      .map(r => ({
        codigo:        String(r.codigo      || "").trim(),
        nombre:        String(r.nombre      || "").trim(),
        precioCompra:  parseFloat(r.precio_compra  || 0) || 0,
        precioVenta:   parseFloat(r.precio_venta1  || r.precio_venta || 0) || 0,
        precioGremio:  parseFloat(r.precio_venta2  || r.precio_gremio || 0) || 0,
        categoria:     String(r.categoria   || "General").trim(),
        stock:         0,
        stockMinimo:   0,
      }));
    setImportData(parsed);
    setImportModal(true);
  };

  const handleImportar = async () => {
    setImporting(true);
    try {
      // Si es reemplazar: borrar todos los insumos existentes primero
      if (modoImport === "reemplazar") {
        const snap = await getDocs(collection(db, "insumos"));
        // Borrar en lotes para no sobrecargar Firebase
        const borrar = snap.docs.map(d => deleteDoc(doc(db, "insumos", d.id)));
        await Promise.all(borrar);
      }
      // Agregar los nuevos — respetar stock existente si es modo agregar
      const snapActual = modoImport === "agregar" ? await getDocs(collection(db, "insumos")) : null;
      const mapaActual = {};
      if (snapActual) {
        snapActual.docs.forEach(d => {
          const data = d.data();
          if (data.codigo) mapaActual[data.codigo] = { fireId: d.id, ...data };
        });
      }
      const batch = importData.slice(0, 500);
      for (const ins of batch) {
        if (modoImport === "agregar" && ins.codigo && mapaActual[ins.codigo]) {
          // Actualizar precios pero conservar stock
          await updateDoc(doc(db, "insumos", mapaActual[ins.codigo].fireId), {
            nombre:       ins.nombre,
            precioCompra: ins.precioCompra,
            precioVenta:  ins.precioVenta,
            precioGremio: ins.precioGremio,
            categoria:    ins.categoria,
          });
        } else {
          await addDoc(collection(db, "insumos"), ins);
        }
      }
      setImportModal(false);
      showToast(`✅ ${batch.length} insumos ${modoImport === "reemplazar" ? "reemplazados" : "actualizados"} correctamente`);
    } catch(e) {
      showToast("Error al importar", "error");
      console.error(e);
    }
    setImporting(false);
  };

  const handleDelete = async (ins) => {
    if (!window.confirm(`¿Eliminar "${ins.nombre}"?`)) return;
    await deleteDoc(doc(db, "insumos", ins.fireId));
    showToast("Insumo eliminado", "error");
  };

  const handleStockUpdate = async (ins, delta) => {
    const nuevoStock = (parseFloat(ins.stock)||0) + delta;
    if (nuevoStock < 0) return;
    await updateDoc(doc(db, "insumos", ins.fireId), { stock: nuevoStock });
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    await updateDoc(doc(db, "insumos", editModal.fireId), {
      nombre:       editModal.nombre,
      codigo:       editModal.codigo,
      categoria:    editModal.categoria,
      precioCompra: parseFloat(editModal.precioCompra)||0,
      precioVenta:  parseFloat(editModal.precioVenta)||0,
      precioGremio: parseFloat(editModal.precioGremio)||0,
      stockMinimo:  parseFloat(editModal.stockMinimo)||0,
    });
    showToast("Insumo actualizado ✅");
    setEditModal(null);
  };

  const stockBajo = insumos.filter(i => (parseFloat(i.stock)||0) <= (parseFloat(i.stockMinimo)||0) && (parseFloat(i.stockMinimo)||0) > 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:"#1a2340" }}>📦 Insumos</h2>
          <p style={{ fontSize:14, color:"#a09080", marginTop:4 }}>{insumos.length} insumos · {filtrados.length} mostrados</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={async () => {
            if (!window.confirm(`⚠️ ¿Seguro que querés borrar los ${insumos.length} insumos? Esta acción no se puede deshacer.`)) return;
            const snap = await getDocs(collection(db, "insumos"));
            await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "insumos", d.id))));
            showToast("Todos los insumos fueron eliminados", "error");
          }} style={{ background:"transparent", border:"1.5px solid #ef5350", color:"#ef5350", padding:"9px 16px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            🗑 Borrar todos
          </button>
          <label style={{ background:"#fff", border:"1.5px solid #e65100", color:"#e65100", padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            📥 Importar Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleExcel} style={{ display:"none" }}/>
          </label>
          <button onClick={() => setView("nuevoInsumo")}
            style={{ background:"#e65100", color:"#fff", border:"none", padding:"10px 20px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            ➕ Nuevo Insumo
          </button>
        </div>
      </div>

      {/* Alerta stock bajo */}
      {stockBajo.length > 0 && (
        <div style={{ background:"#fff3e0", border:"1.5px solid #ff9800", borderRadius:10, padding:"12px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:"#e65100" }}>Stock bajo en {stockBajo.length} insumo{stockBajo.length!==1?"s":""}</div>
            <div style={{ fontSize:12, color:"#bf360c" }}>{stockBajo.map(i=>i.nombre).join(" · ")}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"14px 18px", marginBottom:18, display:"flex", gap:12, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:"1 1 220px" }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }}>🔍</span>
          <input placeholder="Buscar por nombre o código..." value={busq} onChange={e=>setBusq(e.target.value)}
            style={{ width:"100%", padding:"10px 14px 10px 32px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
        </div>
        <select value={filtroCat} onChange={e=>setFiltroCat(e.target.value)}
          style={{ padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", cursor:"pointer", minWidth:180 }}>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {loadingInsumos ? (
        <div style={{ textAlign:"center", padding:40, color:"#a09080" }}>Cargando insumos...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"52px 24px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:14 }}>📦</div>
          <div style={{ fontWeight:700, fontSize:18, fontFamily:"'DM Sans',sans-serif", marginBottom:6 }}>{busq||filtroCat!=="Todas"?"Sin resultados":"No hay insumos aún"}</div>
          <div style={{ color:"#a09080", fontSize:14 }}>Importá tu lista desde Excel o agregá insumos uno a uno</div>
        </div>
      ) : (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            <thead>
              <tr style={{ background:"#fffaf7" }}>
                {["Código","Nombre","Categoría","P. Compra","P. Venta","P. Gremio","Stock",""].map(h => (
                  <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", borderBottom:"1px solid #f5e8e0", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(ins => {
                const stockN = parseFloat(ins.stock)||0;
                const minN   = parseFloat(ins.stockMinimo)||0;
                const bajo   = minN > 0 && stockN <= minN;
                return (
                  <tr key={ins.fireId} style={{ borderBottom:"1px solid #fef0e8", background:bajo?"#fff8f0":"#fff" }}>
                    <td style={{ padding:"11px 14px", color:"#a09080", fontSize:12, fontFamily:"monospace" }}>{ins.codigo||"—"}</td>
                    <td style={{ padding:"11px 14px", fontWeight:600, color:"#1a2340", maxWidth:280 }}>
                      {ins.nombre}
                      {bajo && <span style={{ marginLeft:6, fontSize:10, background:"#ffebee", color:"#c62828", padding:"2px 6px", borderRadius:10, fontWeight:700 }}>STOCK BAJO</span>}
                    </td>
                    <td style={{ padding:"11px 14px" }}>
                      <span style={{ background:"#fff3e0", color:"#bf360c", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{ins.categoria||"—"}</span>
                    </td>
                    <td style={{ padding:"11px 14px", color:"#4a5568" }}>{ins.precioCompra?`$${parseFloat(ins.precioCompra).toLocaleString("es-AR")}`:"—"}</td>
                    <td style={{ padding:"11px 14px", fontWeight:600, color:"#1a2340" }}>{ins.precioVenta?`$${parseFloat(ins.precioVenta).toLocaleString("es-AR")}`:"—"}</td>
                    <td style={{ padding:"11px 14px", fontWeight:600, color:"#e65100" }}>{ins.precioGremio?`$${parseFloat(ins.precioGremio).toLocaleString("es-AR")}`:"—"}</td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <button onClick={() => handleStockUpdate(ins,-1)} style={{ background:"#ffebee", border:"none", color:"#c62828", width:24, height:24, borderRadius:5, fontWeight:700, cursor:"pointer", fontSize:14 }}>−</button>
                        <span style={{ fontWeight:700, color:bajo?"#c62828":"#1a2340", minWidth:28, textAlign:"center" }}>{stockN}</span>
                        <button onClick={() => handleStockUpdate(ins,1)}  style={{ background:"#e8f5e9", border:"none", color:"#2e7d32", width:24, height:24, borderRadius:5, fontWeight:700, cursor:"pointer", fontSize:14 }}>+</button>
                      </div>
                    </td>
                    <td style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex", gap:5 }}>
                        <button onClick={() => setEditModal({...ins})} style={{ background:"#fff8f5", border:"1.5px solid #e65100", color:"#e65100", padding:"4px 8px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:600 }}>✏️</button>
                        <button onClick={() => handleDelete(ins)} style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"4px 8px", borderRadius:6, fontSize:12, cursor:"pointer" }}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal importar */}
      {importModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }} onClick={() => setImportModal(false)}>
          <div style={{ background:"#fff", borderRadius:16, padding:"32px 36px", width:"100%", maxWidth:680, maxHeight:"80vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:"#1a2340", marginBottom:6 }}>📥 Vista previa de importación</div>
            <div style={{ fontSize:13, color:"#a09080", marginBottom:16 }}>{importData.length} productos encontrados en la pestaña "Precios final"</div>

            {/* Selector modo importación */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              <div onClick={()=>setModoImport("reemplazar")}
                style={{ padding:"14px 16px", borderRadius:10, border:`2px solid ${modoImport==="reemplazar"?"#e65100":"#f0d5c0"}`, background:modoImport==="reemplazar"?"#fff8f5":"#fff", cursor:"pointer", transition:"all .15s" }}>
                <div style={{ fontWeight:700, fontSize:14, color:modoImport==="reemplazar"?"#e65100":"#1a2340", marginBottom:4 }}>🔄 Reemplazar todo</div>
                <div style={{ fontSize:12, color:"#a09080", lineHeight:1.4 }}>Borra los insumos actuales y carga los del Excel. <strong>Conserva el stock que ya tenías cargado.</strong></div>
              </div>
              <div onClick={()=>setModoImport("agregar")}
                style={{ padding:"14px 16px", borderRadius:10, border:`2px solid ${modoImport==="agregar"?"#e65100":"#f0d5c0"}`, background:modoImport==="agregar"?"#fff8f5":"#fff", cursor:"pointer", transition:"all .15s" }}>
                <div style={{ fontWeight:700, fontSize:14, color:modoImport==="agregar"?"#e65100":"#1a2340", marginBottom:4 }}>➕ Actualizar precios</div>
                <div style={{ fontSize:12, color:"#a09080", lineHeight:1.4 }}>Actualiza precios de los existentes por código. Agrega los nuevos. Conserva todo el stock.</div>
              </div>
            </div>

            {modoImport==="reemplazar" && (
              <div style={{ background:"#fff3e0", border:"1.5px solid #ffb74d", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#e65100", fontWeight:600 }}>
                ⚠️ Se borrarán todos los insumos actuales y se cargarán los del Excel. El stock actual se perderá.
              </div>
            )}

            <div style={{ maxHeight:280, overflowY:"auto", borderRadius:8, border:"1px solid #f0d5c0", marginBottom:20 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#fffaf7", position:"sticky", top:0 }}>
                    {["Código","Nombre","Categoría","P.Compra","P.Venta","P.Gremio"].map(h=>(
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:700, color:"#a09080", fontSize:10, textTransform:"uppercase", borderBottom:"1px solid #f0d5c0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importData.slice(0,100).map((r,i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #fef0e8" }}>
                      <td style={{ padding:"7px 12px", color:"#a09080", fontFamily:"monospace" }}>{r.codigo||"—"}</td>
                      <td style={{ padding:"7px 12px", fontWeight:600, color:"#1a2340" }}>{r.nombre}</td>
                      <td style={{ padding:"7px 12px" }}><span style={{ background:"#fff3e0", color:"#bf360c", padding:"2px 7px", borderRadius:10, fontSize:10, fontWeight:600 }}>{r.categoria}</span></td>
                      <td style={{ padding:"7px 12px" }}>{r.precioCompra?`$${r.precioCompra.toLocaleString("es-AR")}`:"—"}</td>
                      <td style={{ padding:"7px 12px", fontWeight:600 }}>{r.precioVenta?`$${r.precioVenta.toLocaleString("es-AR")}`:"—"}</td>
                      <td style={{ padding:"7px 12px", color:"#e65100", fontWeight:600 }}>{r.precioGremio?`$${r.precioGremio.toLocaleString("es-AR")}`:"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importData.length > 100 && <div style={{ padding:"10px 12px", fontSize:12, color:"#a09080", textAlign:"center" }}>...y {importData.length-100} más</div>}
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setImportModal(false)} style={{ padding:"10px 20px", background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
              <button onClick={handleImportar} disabled={importing}
                style={{ padding:"10px 28px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", opacity:importing?.7:1 }}>
                {importing
                  ? "Procesando..."
                  : modoImport==="reemplazar"
                    ? `🔄 Reemplazar con ${importData.length} insumos`
                    : `➕ Actualizar ${importData.length} insumos`
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar inline */}
      {editModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }} onClick={() => setEditModal(null)}>
          <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", width:"100%", maxWidth:500, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#1a2340", marginBottom:20 }}>✏️ Editar Insumo</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {[["Nombre","nombre","1 / -1"],["Código","codigo"],["Categoría","categoria"],["Precio Compra","precioCompra"],["Precio Venta","precioVenta"],["Precio Gremio","precioGremio"],["Stock Mínimo","stockMinimo"]].map(([label,key,col]) => (
                <div key={key} style={{ gridColumn:col||"auto" }}>
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#4a5568", marginBottom:4 }}>{label}</label>
                  <input value={editModal[key]||""} onChange={e=>setEditModal(m=>({...m,[key]:e.target.value}))}
                    style={{ width:"100%", padding:"9px 12px", borderRadius:7, border:"1.5px solid #f0d5c0", fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
              <button onClick={() => setEditModal(null)} style={{ padding:"9px 18px", background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
              <button onClick={handleEditSave} style={{ padding:"9px 22px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>💾 Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente: Formulario Insumo (nuevo) ────────────────────────────────
function FormularioInsumo({ view, editingInsumoId, setView, showToast }) {
  const [form, setForm]   = useState({ codigo:"", nombre:"", categoria:"", precioCompra:"", precioVenta:"", precioGremio:"", stock:0, stockMinimo:0 });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "insumos"), {
        ...form,
        precioCompra:  parseFloat(form.precioCompra)||0,
        precioVenta:   parseFloat(form.precioVenta)||0,
        precioGremio:  parseFloat(form.precioGremio)||0,
        stock:         parseFloat(form.stock)||0,
        stockMinimo:   parseFloat(form.stockMinimo)||0,
      });
      showToast("Insumo creado ✅");
      setView("insumos");
    } catch(e) {
      showToast("Error al guardar", "error");
    }
    setSaving(false);
  };

  const inp3 = (field) => ({
    width:"100%", padding:"10px 14px", borderRadius:8,
    border:`1.5px solid ${errors[field]?"#ef5350":"#f0d5c0"}`,
    fontSize:14, fontFamily:"'DM Sans',sans-serif",
    color:"#1a2340", outline:"none", boxSizing:"border-box"
  });

  return (
    <div>
      <button onClick={() => setView("insumos")} style={{ background:"transparent", border:"none", color:"#e65100", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>← Volver</button>
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"32px 36px" }}>
        <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:24, fontWeight:700, color:"#1a2340", marginBottom:4 }}>➕ Nuevo Insumo</h2>
        <p style={{ fontSize:14, color:"#a09080", marginBottom:24 }}>Completá los datos del insumo.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
          <div style={{ gridColumn:"1 / -1" }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Nombre *</label>
            <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Descripción del insumo" style={inp3("nombre")}/>
            {errors.nombre && <div style={{ color:"#ef5350", fontSize:12, marginTop:4 }}>{errors.nombre}</div>}
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Código</label>
            <input value={form.codigo} onChange={e=>setForm(f=>({...f,codigo:e.target.value}))} placeholder="IT01" style={inp3()}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Categoría</label>
            <input value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} placeholder="TINTA, SUBLIMADO..." style={inp3()}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Precio Compra</label>
            <input type="number" value={form.precioCompra} onChange={e=>setForm(f=>({...f,precioCompra:e.target.value}))} placeholder="0" style={inp3()}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Precio Venta</label>
            <input type="number" value={form.precioVenta} onChange={e=>setForm(f=>({...f,precioVenta:e.target.value}))} placeholder="0" style={inp3()}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Precio Venta Gremio</label>
            <input type="number" value={form.precioGremio} onChange={e=>setForm(f=>({...f,precioGremio:e.target.value}))} placeholder="0" style={inp3()}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Stock Mínimo (alerta)</label>
            <input type="number" value={form.stockMinimo} onChange={e=>setForm(f=>({...f,stockMinimo:e.target.value}))} placeholder="0" style={inp3()}/>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:28 }}>
          <button onClick={() => setView("insumos")} style={{ padding:"10px 22px", background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:"10px 28px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", opacity:saving?.7:1 }}>
            {saving ? "Guardando..." : "✅ Crear Insumo"}
          </button>
        </div>
      </div>
    </div>
  );
}


function ClientesView({ clientes, pedidos, setView, setFormData, setEditingClienteId, showToast }) {
  const [busq, setBusq]           = useState("");
  const [selected, setSelected]   = useState(null); // cliente seleccionado para ver detalle
  const [pagoModal, setPagoModal] = useState(null); // { cliente }
  const [montoPago, setMontoPago] = useState("");

  const filtrados = clientes.filter(c => {
    const q = busq.toLowerCase();
    return !busq || `${c.nombre} ${c.apellido} ${c.empresa||""} ${c.telefono||""} ${c.mail||""}`.toLowerCase().includes(q);
  }).sort((a,b) => `${a.nombre}${a.apellido}`.localeCompare(`${b.nombre}${b.apellido}`));

  const pedidosCliente = (cl) => pedidos.filter(p =>
    p.clienteId === cl.fireId || p.cliente === `${cl.nombre} ${cl.apellido}`.trim()
  );

  const handleDelete = async (cl) => {
    if (!window.confirm(`¿Eliminar a ${cl.nombre} ${cl.apellido}?`)) return;
    await deleteDoc(doc(db, "clientes", cl.fireId));
    setSelected(null);
    showToast("Cliente eliminado", "error");
  };

  const handlePago = async () => {
    const monto = parseFloat(montoPago);
    if (!monto || monto <= 0) return;
    const cl = pagoModal.cliente;
    const nuevoSaldo = (parseFloat(cl.saldoCuenta)||0) - monto;
    await updateDoc(doc(db, "clientes", cl.fireId), { saldoCuenta: nuevoSaldo });
    // Registrar movimiento
    await addDoc(collection(db, "movimientosCuenta"), {
      clienteId: cl.fireId,
      tipo: "pago",
      monto,
      fecha: new Date().toISOString().split("T")[0],
      descripcion: "Pago en cuenta corriente"
    });
    showToast(`Pago de $${monto.toLocaleString("es-AR")} registrado ✅`);
    setPagoModal(null);
    setMontoPago("");
  };

  if (selected) {
    const cl = clientes.find(c => c.fireId === selected);
    if (!cl) { setSelected(null); return null; }
    const historial = pedidosCliente(cl).sort((a,b) => b.fechaPedido?.localeCompare(a.fechaPedido||"")||0);
    const saldo = parseFloat(cl.saldoCuenta)||0;
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background:"transparent", border:"none", color:"#e65100", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>← Volver a clientes</button>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
          {/* Ficha */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"24px 28px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:"#1a2340" }}>{cl.nombre} {cl.apellido}</div>
                {cl.empresa && <div style={{ fontSize:13, color:"#a09080", marginTop:2 }}>🏢 {cl.empresa}</div>}
              </div>
              <button onClick={() => { setEditingClienteId(cl.fireId); setView("editarCliente"); }}
                style={{ background:"#fff8f5", border:"1.5px solid #e65100", color:"#e65100", padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                ✏️ Editar
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {cl.telefono  && <div style={{ fontSize:13 }}>📞 <strong style={{color:"#e65100"}}>{cl.telefono}</strong></div>}
              {cl.mail      && <div style={{ fontSize:13 }}>✉️ {cl.mail}</div>}
              {cl.cuit      && <div style={{ fontSize:13 }}>🪪 CUIT: {cl.cuit}</div>}
              {cl.direccion && <div style={{ fontSize:13 }}>📍 {cl.direccion}</div>}
            </div>
          </div>
          {/* Cuenta corriente */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"24px 28px" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", marginBottom:8 }}>Cuenta Corriente</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:36, fontWeight:700, color:saldo>0?"#c62828":"#2e7d32", marginBottom:16 }}>
              ${Math.abs(saldo).toLocaleString("es-AR")}
            </div>
            <div style={{ fontSize:13, color:"#a09080", marginBottom:16 }}>{saldo>0?"Saldo deudor":"Sin deuda pendiente"}</div>
            {saldo > 0 && (
              <button onClick={() => setPagoModal({ cliente: cl })}
                style={{ background:"#e65100", color:"#fff", border:"none", padding:"10px 20px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", width:"100%" }}>
                💵 Registrar Pago
              </button>
            )}
          </div>
        </div>

        {/* Historial pedidos */}
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f5e8e0" }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:"#1a2340" }}>
              📋 Historial de Pedidos ({historial.length})
            </div>
          </div>
          {historial.length === 0 ? (
            <div style={{ padding:"32px", textAlign:"center", color:"#a09080", fontSize:14 }}>Sin pedidos registrados</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#fffaf7" }}>
                  {["Pedido","Estado","Fecha Entrega","Total","Saldo"].map(h => (
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", borderBottom:"1px solid #f5e8e0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map(p => {
                  const saldoP = parseFloat(p.precio||0) - parseFloat(p.seña||0);
                  const ec = ESTADO_COLOR[p.estado] || { bg:"#f5f5f5", text:"#616161" };
                  return (
                    <tr key={p.fireId||p.id} style={{ borderBottom:"1px solid #fef0e8" }}>
                      <td style={{ padding:"11px 16px", fontWeight:600, color:"#1a2340" }}>{p.nombre}</td>
                      <td style={{ padding:"11px 16px" }}>
                        <span style={{ background:ec.bg, color:ec.text, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600 }}>{p.estado}</span>
                      </td>
                      <td style={{ padding:"11px 16px", color:"#4a5568" }}>{p.fechaEntrega||"—"}</td>
                      <td style={{ padding:"11px 16px", fontWeight:600 }}>{p.precio?`$${parseFloat(p.precio).toLocaleString("es-AR")}`:"—"}</td>
                      <td style={{ padding:"11px 16px", fontWeight:700, color:saldoP>0?"#c62828":"#2e7d32" }}>{p.precio?`$${saldoP.toLocaleString("es-AR")}`:"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop:16, display:"flex", justifyContent:"flex-end" }}>
          <button onClick={() => handleDelete(cl)} style={{ background:"transparent", border:"1.5px solid #ef5350", color:"#ef5350", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>🗑 Eliminar cliente</button>
        </div>

        {/* Modal pago */}
        {pagoModal && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }} onClick={() => setPagoModal(null)}>
            <div style={{ background:"#fff", borderRadius:16, padding:"32px 36px", width:360, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#1a2340", marginBottom:6 }}>💵 Registrar Pago</div>
              <div style={{ fontSize:13, color:"#a09080", marginBottom:20 }}>Saldo actual: <strong style={{color:"#c62828"}}>${(parseFloat(pagoModal.cliente.saldoCuenta)||0).toLocaleString("es-AR")}</strong></div>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Monto del pago</label>
              <input type="number" value={montoPago} onChange={e=>setMontoPago(e.target.value)}
                placeholder="0" autoFocus
                style={{ width:"100%", padding:"11px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:16, fontWeight:700, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box", marginBottom:20 }}/>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setPagoModal(null)} style={{ flex:1, padding:"10px", background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
                <button onClick={handlePago} style={{ flex:2, padding:"10px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>✅ Confirmar Pago</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:"#1a2340" }}>👥 Clientes</h2>
          <p style={{ fontSize:14, color:"#a09080", marginTop:4 }}>{clientes.length} cliente{clientes.length!==1?"s":""} registrado{clientes.length!==1?"s":""}</p>
        </div>
        <button onClick={() => setView("nuevoCliente")}
          style={{ background:"#e65100", color:"#fff", border:"none", padding:"10px 22px", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
          ➕ Nuevo Cliente
        </button>
      </div>

      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"14px 18px", marginBottom:18 }}>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>🔍</span>
          <input placeholder="Buscar por nombre, empresa, teléfono..." value={busq} onChange={e=>setBusq(e.target.value)}
            style={{ width:"100%", padding:"10px 14px 10px 34px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" }}/>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"52px 24px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:14 }}>👥</div>
          <div style={{ fontWeight:700, fontSize:18, fontFamily:"'DM Sans',sans-serif", marginBottom:6 }}>{busq?"Sin resultados":"No hay clientes aún"}</div>
          <div style={{ color:"#a09080", fontSize:14 }}>Agregá tu primer cliente con el botón de arriba</div>
        </div>
      ) : (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            <thead>
              <tr style={{ background:"#fffaf7" }}>
                {["Cliente","Empresa","Teléfono","Mail","Cuenta Corriente",""].map(h => (
                  <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", borderBottom:"1px solid #f5e8e0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(cl => {
                const saldo = parseFloat(cl.saldoCuenta)||0;
                const nPedidos = pedidosCliente(cl).length;
                return (
                  <tr key={cl.fireId} style={{ borderBottom:"1px solid #fef0e8", cursor:"pointer" }}
                    onMouseOver={e=>e.currentTarget.style.background="#fffaf7"}
                    onMouseOut={e=>e.currentTarget.style.background="#fff"}
                    onClick={() => setSelected(cl.fireId)}>
                    <td style={{ padding:"13px 16px" }}>
                      <div style={{ fontWeight:700, color:"#1a2340" }}>{cl.nombre} {cl.apellido}</div>
                      <div style={{ fontSize:11, color:"#a09080", marginTop:2 }}>{nPedidos} pedido{nPedidos!==1?"s":""}</div>
                    </td>
                    <td style={{ padding:"13px 16px", color:"#4a5568" }}>{cl.empresa||"—"}</td>
                    <td style={{ padding:"13px 16px", fontWeight:700, color:"#e65100" }}>{cl.telefono ? `📞 ${cl.telefono}` : "—"}</td>
                    <td style={{ padding:"13px 16px", color:"#4a5568" }}>{cl.mail||"—"}</td>
                    <td style={{ padding:"13px 16px" }}>
                      {saldo > 0
                        ? <span style={{ fontWeight:700, color:"#c62828", background:"#ffebee", padding:"3px 10px", borderRadius:20, fontSize:12 }}>Debe ${saldo.toLocaleString("es-AR")}</span>
                        : <span style={{ fontWeight:600, color:"#2e7d32", background:"#e8f5e9", padding:"3px 10px", borderRadius:20, fontSize:12 }}>Al día ✓</span>
                      }
                    </td>
                    <td style={{ padding:"13px 16px" }} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => { setEditingClienteId(cl.fireId); setView("editarCliente"); }}
                          style={{ background:"#fff8f5", border:"1.5px solid #e65100", color:"#e65100", padding:"5px 10px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer" }}>✏️</button>
                        <button onClick={() => handleDelete(cl)}
                          style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"5px 10px", borderRadius:6, fontSize:12, cursor:"pointer" }}>🗑</button>
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
}

// ── Componente: Formulario de Cliente ────────────────────────────────────
function FormularioCliente({ view, editingClienteId, clientes, setView, setSelectedClienteId, setClienteSearch, setFormData, formData, showToast }) {
  const esEdicion = view === "editarCliente";
  const clienteExistente = esEdicion ? clientes.find(c => c.fireId === editingClienteId) : null;

  const [form, setForm] = useState(clienteExistente || { ...EMPTY_CLIENTE });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (esEdicion && editingClienteId) {
        await updateDoc(doc(db, "clientes", editingClienteId), form);
        showToast("Cliente actualizado ✅");
      } else {
        const ref = await addDoc(collection(db, "clientes"), { ...form, saldoCuenta: 0 });
        // Si venimos del formulario de pedido, seleccionar este cliente
        if (formData?._volver === "formulario") {
          setSelectedClienteId(ref.id);
          setClienteSearch(`${form.nombre} ${form.apellido}`.trim());
          setFormData(p => ({ ...p, cliente:`${form.nombre} ${form.apellido}`.trim(), telefono:form.telefono||"", _volver:undefined }));
          setView("formulario");
          return;
        }
        showToast("Cliente creado exitosamente 🎉");
      }
      setView("clientes");
    } catch(e) {
      showToast("Error al guardar", "error");
    }
    setSaving(false);
  };

  const inp2 = (field) => ({
    width:"100%", padding:"10px 14px", borderRadius:8,
    border:`1.5px solid ${errors[field]?"#ef5350":"#f0d5c0"}`,
    fontSize:14, fontFamily:"'DM Sans',sans-serif",
    color:"#1a2340", outline:"none", boxSizing:"border-box"
  });

  return (
    <div>
      <button onClick={() => setView(esEdicion?"clientes":"clientes")} style={{ background:"transparent", border:"none", color:"#e65100", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>← Volver</button>
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"32px 36px" }}>
        <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:24, fontWeight:700, color:"#1a2340", marginBottom:4 }}>
          {esEdicion ? "✏️ Editar Cliente" : "➕ Nuevo Cliente"}
        </h2>
        <p style={{ fontSize:14, color:"#a09080", marginBottom:24 }}>Completá los datos del cliente.</p>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Nombre *</label>
            <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre" style={inp2("nombre")}/>
            {errors.nombre && <div style={{ color:"#ef5350", fontSize:12, marginTop:4 }}>{errors.nombre}</div>}
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Apellido</label>
            <input value={form.apellido} onChange={e=>setForm(f=>({...f,apellido:e.target.value}))} placeholder="Apellido" style={inp2()}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Empresa</label>
            <input value={form.empresa} onChange={e=>setForm(f=>({...f,empresa:e.target.value}))} placeholder="Nombre de la empresa" style={inp2()}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>CUIT</label>
            <input value={form.cuit} onChange={e=>setForm(f=>({...f,cuit:e.target.value}))} placeholder="XX-XXXXXXXX-X" style={inp2()}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Teléfono / WhatsApp</label>
            <input value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} placeholder="11-xxxx-xxxx" style={inp2()}/>
          </div>
          <div>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Mail</label>
            <input value={form.mail} onChange={e=>setForm(f=>({...f,mail:e.target.value}))} placeholder="cliente@mail.com" style={inp2()}/>
          </div>
          <div style={{ gridColumn:"1 / -1" }}>
            <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Dirección</label>
            <input value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))} placeholder="Calle, número, ciudad" style={inp2()}/>
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:28 }}>
          <button onClick={() => setView("clientes")} style={{ padding:"10px 22px", background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:"10px 28px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", opacity:saving?.7:1 }}>
            {saving ? "Guardando..." : esEdicion ? "💾 Guardar Cambios" : "✅ Crear Cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Buscador Global ───────────────────────────────────────────────────────
function BuscadorGlobal({ pedidos, clientes, busqueda, setBusqueda, onClose, onSelectPedido, onSelectCliente, ESTADO_COLOR, CATEGORIA_COLOR, CATEGORIA_ICON }) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const palabras = busqueda.toLowerCase().split(/\s+/).filter(Boolean);

  const matchTexto = (texto) => {
    if (!palabras.length) return false;
    const t = texto.toLowerCase();
    return palabras.every(p => t.includes(p));
  };

  const pedidosFiltrados = busqueda.length >= 2 ? pedidos.filter(p =>
    p.estado !== "Entregado" &&
    matchTexto(`${p.nombre} ${p.cliente} ${p.telefono||""} ${p.categoria} ${p.estado}`)
  ).slice(0, 6) : [];

  const clientesFiltrados = busqueda.length >= 2 ? clientes.filter(c =>
    matchTexto(`${c.nombre} ${c.apellido||""} ${c.empresa||""} ${c.telefono||""} ${c.mail||""}`)
  ).slice(0, 4) : [];

  const total = pedidosFiltrados.length + clientesFiltrados.length;

  return (
    <>
      <div className="busq-global-overlay" onClick={onClose}/>
      <div className="busq-global-box">
        <div style={{ display:"flex", alignItems:"center", borderBottom:"1px solid #f0d5c0", padding:"0 16px" }}>
          <span style={{ fontSize:20, marginRight:10, color:"#e65100" }}>🔍</span>
          <input
            ref={inputRef}
            className="busq-global-input"
            placeholder="Buscar pedidos, clientes, teléfonos..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key==="Escape" && onClose()}
          />
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#a09080", fontSize:20, cursor:"pointer", padding:"4px 8px" }}>✕</button>
        </div>

        {busqueda.length < 2 ? (
          <div style={{ padding:"24px 20px", textAlign:"center", color:"#a09080", fontSize:14 }}>
            Escribí al menos 2 caracteres para buscar
          </div>
        ) : total === 0 ? (
          <div style={{ padding:"24px 20px", textAlign:"center", color:"#a09080", fontSize:14 }}>
            Sin resultados para "<strong>{busqueda}</strong>"
          </div>
        ) : (
          <div style={{ maxHeight:420, overflowY:"auto" }}>
            {pedidosFiltrados.length > 0 && (
              <>
                <div style={{ padding:"8px 20px 4px", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", background:"#fffaf7" }}>
                  📋 Pedidos ({pedidosFiltrados.length})
                </div>
                {pedidosFiltrados.map(p => {
                  const ec = ESTADO_COLOR[p.estado] || {bg:"#f5f5f5",text:"#616161"};
                  const cc = CATEGORIA_COLOR[p.categoria] || {bg:"#f5f5f5",text:"#424242",accent:"#9e9e9e"};
                  return (
                    <div key={p.fireId||p.id} className="busq-global-result" onClick={() => onSelectPedido(p)}>
                      <span style={{ fontSize:20 }}>{CATEGORIA_ICON[p.categoria]||"📦"}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:14, color:"#1a2340" }}>{p.nombre}</div>
                        <div style={{ fontSize:12, color:"#a09080" }}>👤 {p.cliente} {p.telefono && `· 📞 ${p.telefono}`}</div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                        <span style={{ background:ec.bg, color:ec.text, padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{p.estado}</span>
                        {p.fechaEntrega && <span style={{ fontSize:11, color:"#a09080" }}>{p.fechaEntrega}</span>}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {clientesFiltrados.length > 0 && (
              <>
                <div style={{ padding:"8px 20px 4px", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", background:"#fffaf7" }}>
                  👥 Clientes ({clientesFiltrados.length})
                </div>
                {clientesFiltrados.map(c => (
                  <div key={c.fireId} className="busq-global-result" onClick={() => { onSelectCliente(c); }}>
                    <span style={{ fontSize:20 }}>👤</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14, color:"#1a2340" }}>{c.nombre} {c.apellido}</div>
                      <div style={{ fontSize:12, color:"#a09080" }}>
                        {c.empresa && `🏢 ${c.empresa} · `}
                        {c.telefono && `📞 ${c.telefono}`}
                      </div>
                    </div>
                    {parseFloat(c.saldoCuenta||0) > 0 && (
                      <span style={{ background:"#ffebee", color:"#c62828", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700 }}>
                        Debe ${parseFloat(c.saldoCuenta).toLocaleString("es-AR")}
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        <div style={{ padding:"8px 20px", background:"#fffaf7", borderTop:"1px solid #f0d5c0", fontSize:11, color:"#a09080", display:"flex", justifyContent:"space-between" }}>
          <span>↵ para abrir · Esc para cerrar</span>
          {total > 0 && <span>{total} resultado{total!==1?"s":""}</span>}
        </div>
      </div>
    </>
  );
}

// ── Componente: Finanzas ─────────────────────────────────────────────────
function FinanzasView({ pedidos, clientes, desbloqueado, setDesbloqueado, showToast }) {
  const [pin, setPin]               = useState("");
  const [pinError, setPinError]     = useState(false);
  const [tabActiva, setTabActiva]   = useState("resumen");
  const [ventas, setVentas]         = useState([]);
  const [gastos, setGastos]         = useState([]);
  const [movCaja, setMovCaja]       = useState([]);
  const [empleados, setEmpleados]   = useState([]);
  const [pinConfig, setPinConfig]   = useState("1234");
  const [periodoFin, setPeriodoFin] = useState("mes");

  // Modales
  const [modalGasto, setModalGasto]       = useState(false);
  const [modalCaja, setModalCaja]         = useState(null); // "ingreso" | "egreso"
  const [modalEmpleado, setModalEmpleado] = useState(null);
  const [modalPago, setModalPago]         = useState(null);
  const [selectedEmp, setSelectedEmp]     = useState(null);

  useEffect(() => {
    if (!desbloqueado) return;
    const u1 = onSnapshot(collection(db,"ventas"), snap => setVentas(snap.docs.map(d=>({...d.data(),fireId:d.id}))));
    const u2 = onSnapshot(collection(db,"gastos"), snap => setGastos(snap.docs.map(d=>({...d.data(),fireId:d.id}))));
    const u3 = onSnapshot(collection(db,"movCaja"), snap => setMovCaja(snap.docs.map(d=>({...d.data(),fireId:d.id}))));
    const u4 = onSnapshot(collection(db,"empleados"), snap => setEmpleados(snap.docs.map(d=>({...d.data(),fireId:d.id}))));
    getDoc(doc(db,"config","finanzas")).then(snap => { if(snap.exists()) setPinConfig(snap.data().pin||"1234"); });
    return () => { u1();u2();u3();u4(); };
  }, [desbloqueado]);

  const hoy    = new Date().toISOString().split("T")[0];
  const mesAct = hoy.slice(0,7);
  const semAct = (() => { const d=new Date(); d.setDate(d.getDate()-7); return d.toISOString().split("T")[0]; })();

  const filtrarPeriodo = (arr, campo="fecha") => {
    if (periodoFin==="hoy")   return arr.filter(x=>x[campo]===hoy);
    if (periodoFin==="semana") return arr.filter(x=>x[campo]>=semAct);
    if (periodoFin==="mes")   return arr.filter(x=>x[campo]?.startsWith(mesAct));
    return arr;
  };

  const ventasFilt  = filtrarPeriodo(ventas);
  const gastosFilt  = filtrarPeriodo(gastos);

  const totalVentas    = ventasFilt.reduce((s,v)=>s+parseFloat(v.total||0),0);
  const totalGastos    = gastosFilt.reduce((s,g)=>s+parseFloat(g.monto||0),0);
  const totalEfectivo  = ventasFilt.filter(v=>v.metodoPago==="Efectivo").reduce((s,v)=>s+parseFloat(v.total||0),0);
  const totalTransfer  = ventasFilt.filter(v=>v.metodoPago==="Transferencia").reduce((s,v)=>s+parseFloat(v.total||0),0);
  const totalTarjeta   = ventasFilt.filter(v=>v.metodoPago==="Tarjeta de Crédito").reduce((s,v)=>s+parseFloat(v.total||0),0);
  const totalCtaCte    = ventasFilt.filter(v=>v.metodoPago==="Cuenta Corriente").reduce((s,v)=>s+parseFloat(v.total||0),0);
  const saldoCaja      = movCaja.reduce((s,m)=>s+(m.tipo==="ingreso"?parseFloat(m.monto||0):-parseFloat(m.monto||0)),0) + totalEfectivo;
  const ganancia       = totalVentas - totalGastos;

  // Datos para gráfico de barras (últimos 7 días)
  const ultimos7 = Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-6+i);
    const f=d.toISOString().split("T")[0];
    const total=ventas.filter(v=>v.fecha===f).reduce((s,v)=>s+parseFloat(v.total||0),0);
    const gastoD=gastos.filter(g=>g.fecha===f).reduce((s,g)=>s+parseFloat(g.monto||0),0);
    return { fecha:f, dia:d.toLocaleDateString("es-AR",{weekday:"short",day:"numeric"}), total, gasto:gastoD };
  });
  const maxBar = Math.max(...ultimos7.map(d=>Math.max(d.total,d.gasto)),1);

  // ── PIN screen ──
  if (!desbloqueado) {
    const handlePin = async () => {
      const snap = await getDoc(doc(db,"config","finanzas")).catch(()=>null);
      const savedPin = snap?.exists() ? snap.data().pin : "1234";
      if (pin === savedPin) { setDesbloqueado(true); setPinError(false); }
      else { setPinError(true); setPin(""); }
    };
    return (
      <div style={{ minHeight:"60vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"48px 44px", width:340, boxShadow:"0 8px 32px rgba(230,81,0,.12)", textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>💼</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:"#1a2340", marginBottom:6 }}>Finanzas</div>
          <div style={{ fontSize:14, color:"#a09080", marginBottom:28 }}>Ingresá tu PIN para continuar</div>
          <div style={{ display:"flex", gap:12, justifyContent:"center", marginBottom:24 }}>
            {[0,1,2,3].map(i=>(
              <div key={i} style={{ width:48, height:56, border:`2px solid ${pinError?"#ef5350":pin.length>i?"#e65100":"#f0d5c0"}`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:700, color:"#e65100", background:pin.length>i?"#fff8f5":"#fff", transition:"all .15s" }}>
                {pin.length>i?"●":""}
              </div>
            ))}
          </div>
          {pinError && <div style={{ color:"#ef5350", fontSize:13, marginBottom:14, fontWeight:600 }}>PIN incorrecto. Intentá de nuevo.</div>}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((n,i)=>(
              <button key={i} onClick={()=>{
                if(n==="⌫") setPin(p=>p.slice(0,-1));
                else if(n!=="" && pin.length<4) { const np=pin+n; setPin(np); if(np.length===4) setTimeout(()=>{ /* auto check */ },100); }
              }}
              style={{ padding:"14px 0", borderRadius:10, border:"1.5px solid #f0d5c0", background:n===""?"transparent":"#fff", fontSize:18, fontWeight:700, color:"#1a2340", cursor:n===""?"default":"pointer", transition:"all .15s" }}
              onMouseOver={e=>{ if(n!=="") e.currentTarget.style.background="#fff8f5"; }}
              onMouseOut={e=>{ e.currentTarget.style.background=n===""?"transparent":"#fff"; }}>
                {n}
              </button>
            ))}
          </div>
          <button onClick={handlePin} disabled={pin.length<4}
            style={{ width:"100%", padding:"13px", background:pin.length<4?"#f0d5c0":"#e65100", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:pin.length<4?"not-allowed":"pointer", transition:"all .2s" }}>
            Ingresar
          </button>
        </div>
      </div>
    );
  }

  const TABS = [
    {id:"resumen",   label:"📊 Resumen"},
    {id:"caja",      label:"🏦 Caja"},
    {id:"gastos",    label:"💸 Gastos"},
    {id:"ventas",    label:"🧾 Ventas"},
    {id:"empleados", label:"👷 RRHH"},
    {id:"config",    label:"⚙️ Config"},
  ];

  return (
    <div>
      {/* Header Finanzas */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:"#1a2340" }}>💼 Finanzas</h2>
          <p style={{ fontSize:14, color:"#a09080", marginTop:4 }}>Panel financiero privado</p>
        </div>
        <button onClick={()=>setDesbloqueado(false)}
          style={{ background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", padding:"7px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
          🔒 Bloquear
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTabActiva(t.id)}
            style={{ padding:"8px 16px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", border:"none", fontFamily:"'DM Sans',sans-serif",
              background:tabActiva===t.id?"#e65100":"#fff", color:tabActiva===t.id?"#fff":"#4a5568",
              boxShadow:tabActiva===t.id?"0 3px 10px rgba(230,81,0,.2)":"0 1px 6px rgba(230,81,0,.07)" }}>
            {t.label}
          </button>
        ))}
        {/* Selector período */}
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {["hoy","semana","mes","total"].map(p=>(
            <button key={p} onClick={()=>setPeriodoFin(p)}
              style={{ padding:"7px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", border:"none",
                background:periodoFin===p?"#1a2340":"#fff", color:periodoFin===p?"#fff":"#4a5568" }}>
              {p==="hoy"?"Hoy":p==="semana"?"Semana":p==="mes"?"Mes":"Total"}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: RESUMEN ── */}
      {tabActiva==="resumen" && (
        <div>
          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
            {[
              {label:"Ventas",    value:`$${totalVentas.toLocaleString("es-AR")}`,   color:"#e65100", icon:"💰"},
              {label:"Gastos",    value:`$${totalGastos.toLocaleString("es-AR")}`,   color:"#c62828", icon:"💸"},
              {label:"Ganancia",  value:`$${ganancia.toLocaleString("es-AR")}`,      color:ganancia>=0?"#2e7d32":"#c62828", icon:"📈"},
              {label:"Saldo Caja",value:`$${saldoCaja.toLocaleString("es-AR")}`,     color:"#1565c0", icon:"🏦"},
            ].map((k,i)=>(
              <div key={i} style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"18px 20px" }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", marginBottom:8 }}>{k.label}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:k.color }}>{k.value}</div>
                  <span style={{ fontSize:24 }}>{k.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Métodos de pago */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"20px 24px" }}>
              <div style={{ fontWeight:700, fontSize:15, color:"#1a2340", marginBottom:16 }}>💳 Ventas por método de pago</div>
              {[
                {label:"Efectivo",       value:totalEfectivo, color:"#2e7d32", bg:"#e8f5e9"},
                {label:"Transferencia",  value:totalTransfer, color:"#1565c0", bg:"#e3f2fd"},
                {label:"Tarjeta",        value:totalTarjeta,  color:"#6a1b9a", bg:"#f3e5f5"},
                {label:"Cta. Corriente", value:totalCtaCte,   color:"#e65100", bg:"#fff3e0"},
              ].map((m,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #fef0e8" }}>
                  <span style={{ background:m.bg, color:m.color, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{m.label}</span>
                  <span style={{ fontWeight:700, color:m.color, fontSize:15 }}>${m.value.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>

            {/* Gráfico barras últimos 7 días */}
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"20px 24px" }}>
              <div style={{ fontWeight:700, fontSize:15, color:"#1a2340", marginBottom:16 }}>📊 Últimos 7 días</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:120 }}>
                {ultimos7.map((d,i)=>(
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                    <div style={{ width:"100%", display:"flex", gap:2, alignItems:"flex-end", height:100 }}>
                      <div title={`Ventas: $${d.total.toLocaleString("es-AR")}`}
                        style={{ flex:1, background:"#e65100", borderRadius:"4px 4px 0 0", height:`${Math.round((d.total/maxBar)*100)}%`, minHeight:d.total>0?4:0, transition:"height .3s" }}/>
                      <div title={`Gastos: $${d.gasto.toLocaleString("es-AR")}`}
                        style={{ flex:1, background:"#ffccbc", borderRadius:"4px 4px 0 0", height:`${Math.round((d.gasto/maxBar)*100)}%`, minHeight:d.gasto>0?4:0, transition:"height .3s" }}/>
                    </div>
                    <div style={{ fontSize:9, color:"#a09080", textAlign:"center", lineHeight:1.2 }}>{d.dia}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:16, marginTop:10, justifyContent:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#a09080" }}><span style={{ width:10, height:10, background:"#e65100", borderRadius:2, display:"inline-block" }}></span>Ventas</div>
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#a09080" }}><span style={{ width:10, height:10, background:"#ffccbc", borderRadius:2, display:"inline-block" }}></span>Gastos</div>
              </div>
            </div>
          </div>

          {/* Ventas recientes */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"20px 24px" }}>
            <div style={{ fontWeight:700, fontSize:15, color:"#1a2340", marginBottom:14 }}>🧾 Últimas ventas</div>
            {ventasFilt.length===0 ? <div style={{ color:"#a09080", fontSize:14, textAlign:"center", padding:"20px 0" }}>Sin ventas en este período</div> :
              ventasFilt.slice(0,8).map(v=>(
                <div key={v.fireId} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid #fef0e8" }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, color:"#1a2340" }}>{v.clienteNombre||"Consumidor Final"}</div>
                    <div style={{ fontSize:11, color:"#a09080" }}>{v.fecha} · {v.items?.length||0} producto{v.items?.length!==1?"s":""} · {v.metodoPago}</div>
                  </div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:700, color:"#e65100" }}>${parseFloat(v.total||0).toLocaleString("es-AR")}</div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── TAB: CAJA ── */}
      {tabActiva==="caja" && (
        <div>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"24px 28px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", marginBottom:6 }}>Saldo en caja</div>
              <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:36, fontWeight:700, color:saldoCaja>=0?"#2e7d32":"#c62828" }}>${saldoCaja.toLocaleString("es-AR")}</div>
              <div style={{ fontSize:12, color:"#a09080", marginTop:4 }}>Incluye ventas en efectivo + movimientos manuales</div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setModalCaja("ingreso")} style={{ background:"#e8f5e9", border:"1.5px solid #2e7d32", color:"#2e7d32", padding:"10px 18px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Ingreso</button>
              <button onClick={()=>setModalCaja("egreso")}  style={{ background:"#ffebee", border:"1.5px solid #c62828", color:"#c62828", padding:"10px 18px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>− Egreso</button>
            </div>
          </div>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead><tr style={{ background:"#fffaf7" }}>
                {["Fecha","Tipo","Descripción","Monto"].map(h=><th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", borderBottom:"1px solid #f5e8e0" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[...movCaja,...ventasFilt.filter(v=>v.metodoPago==="Efectivo").map(v=>({tipo:"ingreso",descripcion:`Venta - ${v.clienteNombre||"Consumidor Final"}`,monto:v.total,fecha:v.fecha,fireId:v.fireId+"_v"}))].sort((a,b)=>b.fecha?.localeCompare(a.fecha||"")||0).slice(0,30).map((m,i)=>(
                  <tr key={i} style={{ borderBottom:"1px solid #fef0e8" }}>
                    <td style={{ padding:"10px 16px", color:"#a09080" }}>{m.fecha}</td>
                    <td style={{ padding:"10px 16px" }}><span style={{ background:m.tipo==="ingreso"?"#e8f5e9":"#ffebee", color:m.tipo==="ingreso"?"#2e7d32":"#c62828", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700 }}>{m.tipo==="ingreso"?"↑ Ingreso":"↓ Egreso"}</span></td>
                    <td style={{ padding:"10px 16px", color:"#1a2340", fontWeight:500 }}>{m.descripcion||"—"}</td>
                    <td style={{ padding:"10px 16px", fontWeight:700, color:m.tipo==="ingreso"?"#2e7d32":"#c62828" }}>${parseFloat(m.monto||0).toLocaleString("es-AR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: GASTOS ── */}
      {tabActiva==="gastos" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#1a2340" }}>
              💸 Gastos — <span style={{ color:"#c62828" }}>${totalGastos.toLocaleString("es-AR")}</span>
            </div>
            <button onClick={()=>setModalGasto(true)} style={{ background:"#e65100", color:"#fff", border:"none", padding:"10px 20px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Cargar Gasto</button>
          </div>
          {gastosFilt.length===0 ? (
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"52px", textAlign:"center", color:"#a09080" }}>Sin gastos en este período</div>
          ) : (
            <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead><tr style={{ background:"#fffaf7" }}>
                  {["Fecha","Categoría","Descripción","Monto",""].map(h=><th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", borderBottom:"1px solid #f5e8e0" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {gastosFilt.sort((a,b)=>b.fecha?.localeCompare(a.fecha||"")||0).map(g=>(
                    <tr key={g.fireId} style={{ borderBottom:"1px solid #fef0e8" }}>
                      <td style={{ padding:"10px 16px", color:"#a09080" }}>{g.fecha}</td>
                      <td style={{ padding:"10px 16px" }}><span style={{ background:"#ffebee", color:"#c62828", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{g.categoria||"Varios"}</span></td>
                      <td style={{ padding:"10px 16px", color:"#1a2340", fontWeight:500 }}>{g.descripcion}</td>
                      <td style={{ padding:"10px 16px", fontWeight:700, color:"#c62828" }}>${parseFloat(g.monto||0).toLocaleString("es-AR")}</td>
                      <td style={{ padding:"10px 14px" }}><button onClick={async()=>{ await deleteDoc(doc(db,"gastos",g.fireId)); showToast("Gasto eliminado","error"); }} style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"4px 8px", borderRadius:6, cursor:"pointer", fontSize:12 }}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: VENTAS DETALLE ── */}
      {tabActiva==="ventas" && (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #f5e8e0", fontWeight:700, fontSize:15, color:"#1a2340" }}>
            🧾 Detalle de ventas — {ventasFilt.length} venta{ventasFilt.length!==1?"s":""} · ${totalVentas.toLocaleString("es-AR")}
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ background:"#fffaf7" }}>
              {["N°","Fecha","Cliente","Items","Método","Total"].map(h=><th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", borderBottom:"1px solid #f5e8e0" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {ventasFilt.sort((a,b)=>b.fecha?.localeCompare(a.fecha||"")||0).map(v=>(
                <tr key={v.fireId} style={{ borderBottom:"1px solid #fef0e8" }}>
                  <td style={{ padding:"10px 16px", color:"#a09080", fontFamily:"monospace", fontSize:12 }}>X-{String(v.numero||1).padStart(5,"0")}</td>
                  <td style={{ padding:"10px 16px", color:"#4a5568" }}>{v.fecha}</td>
                  <td style={{ padding:"10px 16px", fontWeight:600, color:"#1a2340" }}>{v.clienteNombre||"Consumidor Final"}</td>
                  <td style={{ padding:"10px 16px", color:"#4a5568" }}>{v.items?.map(i=>`${i.cantidad}x ${i.nombre}`).join(", ").slice(0,50)||"—"}</td>
                  <td style={{ padding:"10px 16px" }}><span style={{ background:"#fff3e0", color:"#e65100", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{v.metodoPago}</span></td>
                  <td style={{ padding:"10px 16px" }}>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, color:"#e65100", fontSize:15 }}>${parseFloat(v.total||0).toLocaleString("es-AR")}</span>
                      {v.origen==="pedido" && <span style={{ background:"#e8eaf6", color:"#3949ab", padding:"2px 7px", borderRadius:10, fontSize:10, fontWeight:700 }}>PEDIDO</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: EMPLEADOS / RRHH ── */}
      {tabActiva==="empleados" && (
        <div>
          {!selectedEmp ? (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#1a2340" }}>👷 Empleados ({empleados.length})</div>
                <button onClick={()=>setModalEmpleado({})} style={{ background:"#e65100", color:"#fff", border:"none", padding:"10px 20px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Nuevo Empleado</button>
              </div>
              {empleados.length===0 ? (
                <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"52px", textAlign:"center", color:"#a09080" }}>Sin empleados cargados</div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16 }}>
                  {empleados.map(e=>(
                    <div key={e.fireId} onClick={()=>setSelectedEmp(e.fireId)}
                      style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"20px 22px", cursor:"pointer", borderTop:"3px solid #e65100" }}
                      onMouseOver={ev=>ev.currentTarget.style.boxShadow="0 6px 24px rgba(230,81,0,.15)"}
                      onMouseOut={ev=>ev.currentTarget.style.boxShadow="0 2px 14px rgba(230,81,0,.07)"}>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:"#1a2340", marginBottom:4 }}>{e.nombre}</div>
                      <div style={{ fontSize:13, color:"#a09080", marginBottom:10 }}>{e.cargo||"Sin cargo"}</div>
                      <div style={{ fontSize:13, color:"#e65100", fontWeight:700 }}>Sueldo: ${parseFloat(e.sueldo||0).toLocaleString("es-AR")}</div>
                      {e.ingreso && <div style={{ fontSize:11, color:"#a09080", marginTop:4 }}>Desde: {e.ingreso}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <EmpleadoDetalle
              empId={selectedEmp}
              empleados={empleados}
              setSelectedEmp={setSelectedEmp}
              showToast={showToast}
            />
          )}
        </div>
      )}

      {/* ── TAB: CONFIG PIN ── */}
      {tabActiva==="config" && (
        <div>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"28px 32px" }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:"#1a2340", marginBottom:6 }}>🔐 Cambiar PIN de Finanzas</div>
            <p style={{ fontSize:14, color:"#a09080", marginBottom:20 }}>El PIN actual es de 4 dígitos. Solo vos debés conocerlo.</p>
            <CambiarPin showToast={showToast} />
          </div>
        </div>
      )}

      {/* ── MODAL: GASTO ── */}
      {modalGasto && <ModalGasto onClose={()=>setModalGasto(false)} showToast={showToast}/>}

      {/* ── MODAL: MOVIMIENTO CAJA ── */}
      {modalCaja && <ModalCaja tipo={modalCaja} onClose={()=>setModalCaja(null)} showToast={showToast}/>}

      {/* ── MODAL: NUEVO EMPLEADO ── */}
      {modalEmpleado && <ModalEmpleado emp={modalEmpleado} onClose={()=>setModalEmpleado(null)} showToast={showToast}/>}
    </div>
  );
}

// ── Detalle Empleado ──────────────────────────────────────────────────────
function EmpleadoDetalle({ empId, empleados, setSelectedEmp, showToast }) {
  const emp = empleados.find(e=>e.fireId===empId);
  const [pagos, setPagos]       = useState([]);
  const [vacas, setVacas]       = useState([]);
  const [notas, setNotas]       = useState([]);
  const [tab, setTab]           = useState("pagos");
  const [modalPago, setModalPago] = useState(false);
  const [modalVaca, setModalVaca] = useState(false);
  const [nuevaNota, setNuevaNota] = useState("");

  useEffect(() => {
    if (!emp) return;
    const u1 = onSnapshot(collection(db,"pagosSueldo"), snap => setPagos(snap.docs.map(d=>({...d.data(),fireId:d.id})).filter(p=>p.empId===empId)));
    const u2 = onSnapshot(collection(db,"vacaciones"), snap => setVacas(snap.docs.map(d=>({...d.data(),fireId:d.id})).filter(v=>v.empId===empId)));
    const u3 = onSnapshot(collection(db,"notasEmp"), snap => setNotas(snap.docs.map(d=>({...d.data(),fireId:d.id})).filter(n=>n.empId===empId)));
    return () => { u1();u2();u3(); };
  }, [empId]);

  if (!emp) return null;

  const totalPagado = pagos.reduce((s,p)=>s+parseFloat(p.monto||0),0);
  const diasTomados = vacas.filter(v=>v.tipo==="tomado").reduce((s,v)=>s+parseInt(v.dias||0),0);
  const diasDisp    = (parseFloat(emp.diasVacaciones||14)) - diasTomados;

  const agregarNota = async () => {
    if (!nuevaNota.trim()) return;
    await addDoc(collection(db,"notasEmp"), { empId, texto:nuevaNota.trim(), fecha:new Date().toISOString().split("T")[0] });
    setNuevaNota("");
    showToast("Nota guardada ✅");
  };

  return (
    <div>
      <button onClick={()=>setSelectedEmp(null)} style={{ background:"transparent", border:"none", color:"#e65100", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16 }}>← Volver</button>
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"22px 26px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
        <div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:"#1a2340" }}>{emp.nombre}</div>
          <div style={{ fontSize:13, color:"#a09080", marginTop:2 }}>{emp.cargo||"Sin cargo"} · Desde {emp.ingreso||"—"}</div>
          {emp.telefono && <div style={{ fontSize:13, color:"#e65100", fontWeight:700, marginTop:6 }}>📞 {emp.telefono}</div>}
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <div style={{ background:"#fff8f5", borderRadius:10, padding:"10px 16px", textAlign:"center" }}>
            <div style={{ fontSize:10, color:"#a09080", fontWeight:600, textTransform:"uppercase" }}>Sueldo</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:"#e65100" }}>${parseFloat(emp.sueldo||0).toLocaleString("es-AR")}</div>
          </div>
          <div style={{ background:"#f1f8e9", borderRadius:10, padding:"10px 16px", textAlign:"center" }}>
            <div style={{ fontSize:10, color:"#a09080", fontWeight:600, textTransform:"uppercase" }}>Días vac.</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:"#2e7d32" }}>{diasDisp}</div>
          </div>
          <div style={{ background:"#e3f2fd", borderRadius:10, padding:"10px 16px", textAlign:"center" }}>
            <div style={{ fontSize:10, color:"#a09080", fontWeight:600, textTransform:"uppercase" }}>Total pagado</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, color:"#1565c0" }}>${totalPagado.toLocaleString("es-AR")}</div>
          </div>
        </div>
      </div>

      {/* Tabs empleado */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["pagos","💵 Pagos"],["vacaciones","🏖️ Vacaciones"],["notas","📝 Notas"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:"7px 16px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer", border:"none",
              background:tab===t?"#e65100":"#fff", color:tab===t?"#fff":"#4a5568",
              boxShadow:tab===t?"0 3px 10px rgba(230,81,0,.2)":"0 1px 6px rgba(230,81,0,.07)" }}>
            {l}
          </button>
        ))}
        <button onClick={()=>setModalPago(true)} style={{ marginLeft:"auto", background:"#2e7d32", color:"#fff", border:"none", padding:"7px 16px", borderRadius:20, fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Registrar Pago</button>
      </div>

      {tab==="pagos" && (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
          {pagos.length===0 ? <div style={{ padding:"32px", textAlign:"center", color:"#a09080" }}>Sin pagos registrados</div> :
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead><tr style={{ background:"#fffaf7" }}>
                {["Fecha","Concepto","Monto",""].map(h=><th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", borderBottom:"1px solid #f5e8e0" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {pagos.sort((a,b)=>b.fecha?.localeCompare(a.fecha||"")||0).map(p=>(
                  <tr key={p.fireId} style={{ borderBottom:"1px solid #fef0e8" }}>
                    <td style={{ padding:"10px 16px", color:"#a09080" }}>{p.fecha}</td>
                    <td style={{ padding:"10px 16px", color:"#1a2340", fontWeight:500 }}>{p.concepto||"Sueldo"}</td>
                    <td style={{ padding:"10px 16px", fontWeight:700, color:"#2e7d32" }}>${parseFloat(p.monto||0).toLocaleString("es-AR")}</td>
                    <td style={{ padding:"10px 14px" }}><button onClick={async()=>{ await deleteDoc(doc(db,"pagosSueldo",p.fireId)); showToast("Eliminado","error"); }} style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"3px 7px", borderRadius:5, cursor:"pointer", fontSize:11 }}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        </div>
      )}

      {tab==="vacaciones" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <button onClick={()=>setModalVaca(true)} style={{ background:"#e65100", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Registrar Vacaciones</button>
          </div>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
            {vacas.length===0 ? <div style={{ padding:"32px", textAlign:"center", color:"#a09080" }}>Sin registros de vacaciones</div> :
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead><tr style={{ background:"#fffaf7" }}>
                  {["Fecha","Tipo","Días","Nota",""].map(h=><th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#a09080", textTransform:"uppercase", borderBottom:"1px solid #f5e8e0" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {vacas.sort((a,b)=>b.fecha?.localeCompare(a.fecha||"")||0).map(v=>(
                    <tr key={v.fireId} style={{ borderBottom:"1px solid #fef0e8" }}>
                      <td style={{ padding:"10px 16px", color:"#a09080" }}>{v.fecha}</td>
                      <td style={{ padding:"10px 16px" }}><span style={{ background:v.tipo==="tomado"?"#fff3e0":"#e8f5e9", color:v.tipo==="tomado"?"#e65100":"#2e7d32", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{v.tipo==="tomado"?"Tomado":"Acreditado"}</span></td>
                      <td style={{ padding:"10px 16px", fontWeight:700 }}>{v.dias}</td>
                      <td style={{ padding:"10px 16px", color:"#4a5568" }}>{v.nota||"—"}</td>
                      <td style={{ padding:"10px 14px" }}><button onClick={async()=>{ await deleteDoc(doc(db,"vacaciones",v.fireId)); }} style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"3px 7px", borderRadius:5, cursor:"pointer", fontSize:11 }}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </div>
        </div>
      )}

      {tab==="notas" && (
        <div>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <input value={nuevaNota} onChange={e=>setNuevaNota(e.target.value)} onKeyDown={e=>e.key==="Enter"&&agregarNota()}
              placeholder="Escribí una nota sobre el empleado..."
              style={{ flex:1, padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none" }}/>
            <button onClick={agregarNota} style={{ background:"#e65100", color:"#fff", border:"none", padding:"10px 18px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>Agregar</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {notas.sort((a,b)=>b.fecha?.localeCompare(a.fecha||"")||0).map(n=>(
              <div key={n.fireId} style={{ background:"#fff", borderRadius:10, padding:"14px 18px", boxShadow:"0 1px 6px rgba(230,81,0,.07)", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:14, color:"#1a2340", lineHeight:1.5 }}>{n.texto}</div>
                  <div style={{ fontSize:11, color:"#a09080", marginTop:4 }}>{n.fecha}</div>
                </div>
                <button onClick={async()=>{ await deleteDoc(doc(db,"notasEmp",n.fireId)); }} style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"3px 7px", borderRadius:5, cursor:"pointer", fontSize:11 }}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalPago && (
        <ModalSimple titulo="💵 Registrar Pago de Sueldo" onClose={()=>setModalPago(false)} onSave={async(form)=>{
          await addDoc(collection(db,"pagosSueldo"),{empId,...form,fecha:form.fecha||new Date().toISOString().split("T")[0]});
          showToast("Pago registrado ✅"); setModalPago(false);
        }} campos={[{key:"monto",label:"Monto",type:"number",placeholder:"0"},{key:"concepto",label:"Concepto",placeholder:"Sueldo quincenal..."},{key:"fecha",label:"Fecha",type:"date"}]}/>
      )}
      {modalVaca && (
        <ModalSimple titulo="🏖️ Registrar Vacaciones" onClose={()=>setModalVaca(false)} onSave={async(form)=>{
          await addDoc(collection(db,"vacaciones"),{empId,...form,fecha:form.fecha||new Date().toISOString().split("T")[0]});
          showToast("Vacaciones registradas ✅"); setModalVaca(false);
        }} campos={[{key:"dias",label:"Días",type:"number",placeholder:"0"},{key:"tipo",label:"Tipo",type:"select",options:["tomado","acreditado"]},{key:"nota",label:"Nota",placeholder:"Opcional..."},{key:"fecha",label:"Fecha",type:"date"}]}/>
      )}
    </div>
  );
}

// ── Modal Simple reutilizable ─────────────────────────────────────────────
function ModalSimple({ titulo, campos, onClose, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const inp = { width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" };
  const handleSave = async () => { setSaving(true); await onSave(form); setSaving(false); };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", width:420, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:"#1a2340", marginBottom:20 }}>{titulo}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {campos.map(c=>(
            <div key={c.key}>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>{c.label}</label>
              {c.type==="select"
                ? <select value={form[c.key]||""} onChange={e=>setForm(f=>({...f,[c.key]:e.target.value}))} style={{ ...inp, cursor:"pointer" }}>
                    <option value="">Seleccionar...</option>
                    {c.options.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                  </select>
                : <input type={c.type||"text"} value={form[c.key]||""} onChange={e=>setForm(f=>({...f,[c.key]:e.target.value}))} placeholder={c.placeholder||""} style={inp}/>
              }
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
          <button onClick={onClose} style={{ padding:"9px 18px", background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding:"9px 22px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {saving?"Guardando...":"✅ Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modales Finanzas ──────────────────────────────────────────────────────
function ModalGasto({ onClose, showToast }) {
  return <ModalSimple titulo="💸 Cargar Gasto" onClose={onClose} onSave={async(form)=>{
    await addDoc(collection(db,"gastos"),{...form,fecha:form.fecha||new Date().toISOString().split("T")[0],monto:parseFloat(form.monto)||0});
    showToast("Gasto cargado ✅"); onClose();
  }} campos={[{key:"descripcion",label:"Descripción",placeholder:"Ej: Compra de insumos"},{key:"monto",label:"Monto",type:"number",placeholder:"0"},{key:"categoria",label:"Categoría",placeholder:"Insumos, Servicios, Personal..."},{key:"fecha",label:"Fecha",type:"date"}]}/>;
}

function ModalCaja({ tipo, onClose, showToast }) {
  return <ModalSimple titulo={tipo==="ingreso"?"+ Ingreso Manual a Caja":"− Egreso Manual de Caja"} onClose={onClose} onSave={async(form)=>{
    await addDoc(collection(db,"movCaja"),{...form,tipo,fecha:form.fecha||new Date().toISOString().split("T")[0],monto:parseFloat(form.monto)||0});
    showToast(`${tipo==="ingreso"?"Ingreso":"Egreso"} registrado ✅`); onClose();
  }} campos={[{key:"monto",label:"Monto",type:"number",placeholder:"0"},{key:"descripcion",label:"Descripción",placeholder:"Motivo..."},{key:"fecha",label:"Fecha",type:"date"}]}/>;
}

function ModalEmpleado({ emp, onClose, showToast }) {
  return <ModalSimple titulo={emp.fireId?"✏️ Editar Empleado":"👷 Nuevo Empleado"} onClose={onClose} onSave={async(form)=>{
    if(emp.fireId) { await updateDoc(doc(db,"empleados",emp.fireId),form); showToast("Empleado actualizado ✅"); }
    else { await addDoc(collection(db,"empleados"),form); showToast("Empleado creado ✅"); }
    onClose();
  }} campos={[{key:"nombre",label:"Nombre completo",placeholder:"Nombre y apellido"},{key:"cargo",label:"Cargo",placeholder:"Cajero, Operario..."},{key:"sueldo",label:"Sueldo base",type:"number",placeholder:"0"},{key:"ingreso",label:"Fecha de ingreso",type:"date"},{key:"telefono",label:"Teléfono",placeholder:"11-xxxx-xxxx"},{key:"diasVacaciones",label:"Días de vacaciones/año",type:"number",placeholder:"14"}]}/>;
}

function CambiarPin({ showToast }) {
  const [pinActual, setPinActual] = useState("");
  const [pinNuevo, setPinNuevo]   = useState("");
  const [pinConf, setPinConf]     = useState("");
  const [saving, setSaving]       = useState(false);
  const inp = { width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" };
  const handleSave = async () => {
    if (pinNuevo.length!==4||!/^\d{4}$/.test(pinNuevo)) { showToast("El PIN debe ser exactamente 4 dígitos","error"); return; }
    if (pinNuevo!==pinConf) { showToast("Los PINs no coinciden","error"); return; }
    setSaving(true);
    const snap = await getDoc(doc(db,"config","finanzas")).catch(()=>null);
    const savedPin = snap?.exists() ? snap.data().pin : "1234";
    if (pinActual!==savedPin) { showToast("PIN actual incorrecto","error"); setSaving(false); return; }
    await setDoc(doc(db,"config","finanzas"),{pin:pinNuevo});
    showToast("PIN actualizado ✅"); setPinActual(""); setPinNuevo(""); setPinConf(""); setSaving(false);
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div><label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>PIN actual</label><input type="password" maxLength={4} value={pinActual} onChange={e=>setPinActual(e.target.value)} placeholder="••••" style={inp}/></div>
      <div><label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>PIN nuevo (4 dígitos)</label><input type="password" maxLength={4} value={pinNuevo} onChange={e=>setPinNuevo(e.target.value)} placeholder="••••" style={inp}/></div>
      <div><label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Confirmar PIN nuevo</label><input type="password" maxLength={4} value={pinConf} onChange={e=>setPinConf(e.target.value)} placeholder="••••" style={inp}/></div>
      <button onClick={handleSave} disabled={saving} style={{ padding:"11px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer", marginTop:4 }}>
        {saving?"Guardando...":"🔐 Cambiar PIN"}
      </button>
      <p style={{ fontSize:12, color:"#a09080" }}>El PIN por defecto es <strong>1234</strong>. Cambialo antes de usar.</p>
    </div>
  );
}

// ── Modal Confirmar Entrega ───────────────────────────────────────────────
function EntregaModal({ pedido, onConfirmar, onClose }) {
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const saldo = parseFloat(pedido.precio||0) - parseFloat(pedido.seña||0);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:600 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:16, padding:"32px 36px", width:420, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:48, marginBottom:10 }}>📦</div>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:"#1a2340", marginBottom:6 }}>Confirmar Entrega</div>
          <div style={{ fontSize:14, color:"#4a5568", fontWeight:600 }}>{pedido.nombre}</div>
          <div style={{ fontSize:13, color:"#a09080", marginTop:4 }}>Cliente: {pedido.cliente}</div>
        </div>

        {/* Resumen de cobro */}
        <div style={{ background:"#fff8f5", borderRadius:10, padding:"14px 18px", marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13 }}>
            <span style={{ color:"#a09080" }}>Total del pedido:</span>
            <span style={{ fontWeight:700 }}>${parseFloat(pedido.precio||0).toLocaleString("es-AR")}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13 }}>
            <span style={{ color:"#a09080" }}>Seña cobrada:</span>
            <span style={{ fontWeight:700, color:"#2e7d32" }}>${parseFloat(pedido.seña||0).toLocaleString("es-AR")}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1.5px solid #f0d5c0", paddingTop:8, marginTop:4 }}>
            <span style={{ fontWeight:700, color:"#1a2340" }}>Saldo a cobrar:</span>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, color:saldo>0?"#c62828":"#2e7d32" }}>
              ${saldo.toLocaleString("es-AR")}
            </span>
          </div>
        </div>

        {/* Método de pago */}
        <div style={{ marginBottom:22 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:10 }}>Método de pago del saldo:</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {["Efectivo","Transferencia","Tarjeta de Crédito","Cuenta Corriente"].map(m=>(
              <button key={m} onClick={()=>setMetodoPago(m)}
                style={{ padding:"10px 8px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer",
                  border:`2px solid ${metodoPago===m?"#e65100":"#f0d5c0"}`,
                  background:metodoPago===m?"#e65100":"#fff",
                  color:metodoPago===m?"#fff":"#4a5568", transition:"all .15s" }}>
                {m==="Efectivo"?"💵 Efectivo":m==="Transferencia"?"📲 Transferencia":m==="Tarjeta de Crédito"?"💳 Tarjeta":"📒 Cta. Corriente"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"11px", background:"transparent", border:"1.5px solid #f0d5c0", color:"#a09080", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>
            Cancelar
          </button>
          <button onClick={()=>onConfirmar(pedido, metodoPago)}
            style={{ flex:2, padding:"11px", background:"#e65100", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>
            ✅ Confirmar Entrega
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Modal Mensaje WhatsApp ───────────────────────────────────
function MsgModal({ pedido, copied, setCopied, onClose }) {
  const p   = pedido;
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
    <div className="modal-ov" onClick={onClose}>
      <div className="msg-bx" onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
          <div style={{ fontSize:36 }}>💬</div>
          <div>
            <h3 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:21, fontWeight:700, color:"#1a2340", lineHeight:1.1 }}>Mensaje para el cliente</h3>
            <p style={{ fontSize:13, color:"#a09080", marginTop:3 }}>Copiá el mensaje y enviáselo por WhatsApp</p>
          </div>
        </div>
        <div style={{ background:"#e8f5e9", borderRadius:8, padding:"8px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:8, fontSize:13 }}>
          <span>🏢</span>
          <span style={{ fontWeight:600, color:"#1b5e20" }}>{p.cliente}</span>
          {p.telefono && <span style={{ color:"#4a5568" }}>· {p.telefono}</span>}
        </div>
        <textarea className="msg-textarea" rows={6} defaultValue={msg} id="msg-cliente-textarea"/>
        <div style={{ display:"flex", gap:10, marginTop:16, justifyContent:"flex-end" }}>
          <button className="btn-g" style={{ padding:"10px 20px" }} onClick={onClose}>Cerrar</button>
          <button className={`btn-copy${copied?" copied":""}`} onClick={handleCopy}>
            {copied ? "✅ ¡Copiado!" : "📋 Copiar mensaje"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper para imprimir con config lista ────────────────────────────────
function imprimirConConfig(fn, empresa, configCargada) {
  if (!configCargada) {
    alert("Cargando datos del local, intentá en un momento...");
    return;
  }
  fn(empresa);
}

export default function App() {
  const [pedidos, setPedidos]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [user, setUser]                   = useState(null);
  const [authChecked, setAuthChecked]     = useState(false);
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
  const [configCargada, setConfigCargada] = useState(false);
  const [vistaLista, setVistaLista]       = useState("categorias");
  const [showStats, setShowStats]         = useState(true);
  const [clientes, setClientes]           = useState([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [editingClienteId, setEditingClienteId]   = useState(null);
  const [editingInsumoId, setEditingInsumoId]     = useState(null);
  const [nuevoEventoModal, setNuevoEventoModal]   = useState(false);
  const [menuAbierto, setMenuAbierto]             = useState(true);
  const [finanzasDesbloqueado, setFinanzasDesbloqueado] = useState(false);
  const [entregaModal, setEntregaModal]               = useState(null); // { pedido }
  const [busquedaGlobal, setBusquedaGlobal]       = useState("");
  const [busqGlobalOpen, setBusqGlobalOpen]       = useState(false);

  // ── Firebase: verificar sesión ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

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

  // ── Firebase: escuchar clientes en tiempo real ──
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "clientes"), (snap) => {
      setClientes(snap.docs.map(d => ({ ...d.data(), fireId: d.id })));
    });
    return () => unsub();
  }, []);

  // ── Firebase: cargar configuración de empresa ──
  useEffect(() => {
    getDoc(doc(db, "config", "empresa")).then(snap => {
      if (snap.exists()) setEmpresa(snap.data());
      setConfigCargada(true);
    }).catch(() => setConfigCargada(true));
  }, []);

  const handleLogout = () => signOut(auth);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const filtered = useMemo(() => pedidos.filter(p => {
    if (p.estado === "Listo") return false;     // van a Pedidos Listos
    if (p.estado === "Entregado") return false; // van al Historial
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
    // Limpiar campos undefined que Firebase no acepta
    const limpiar = (obj) => Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
    if (editingId !== null) {
      const prev    = pedidos.find(p => p.id === editingId);
      const updated = limpiar({ ...formData, id: editingId, clienteId: selectedClienteId||prev.clienteId||null });
      const fireId  = prev.fireId;
      await updateDoc(doc(db, "pedidos", fireId), updated);
      showToast("Pedido actualizado correctamente");
      triggerPrintIfNeeded(prev, updated);
      triggerMsgIfNeeded(prev, updated);
    } else {
      const newId = Math.max(...pedidos.map(p => p.id), 0) + 1;
      const nuevo = limpiar({ ...formData, id: newId, clienteId: selectedClienteId||null });
      await addDoc(collection(db, "pedidos"), nuevo);
      showToast("Pedido cargado exitosamente 🎉");
      triggerPrintIfNeeded(null, nuevo);
      triggerMsgIfNeeded(null, nuevo);
    }
    setFormData(EMPTY_FORM); setEditingId(null); setErrors({}); setSelectedClienteId(null); setClienteSearch(""); setView("lista");
  };

  const handleEstadoChange = async (id, nuevoEstado) => {
    const prev = pedidos.find(p => p.id === id);
    if (nuevoEstado === "Entregado" && prev.estado !== "Entregado") {
      // Mostrar modal para elegir método de pago antes de marcar entregado
      setEntregaModal({ pedido: prev });
      return;
    }
    const updated = { ...prev, estado: nuevoEstado };
    await updateDoc(doc(db, "pedidos", prev.fireId), { estado: nuevoEstado });
    triggerPrintIfNeeded(prev, updated);
    triggerMsgIfNeeded(prev, updated);
  };

  const confirmarEntrega = async (pedido, metodoPago) => {
    // 1. Marcar pedido como entregado
    await updateDoc(doc(db, "pedidos", pedido.fireId), { estado: "Entregado" });
    // 2. Registrar en ventas de finanzas
    const ventasSnap = await getDocs(collection(db, "ventas"));
    const numero = ventasSnap.size + 1;
    await addDoc(collection(db, "ventas"), {
      numero,
      fecha:         new Date().toISOString().split("T")[0],
      clienteId:     pedido.clienteId || null,
      clienteNombre: pedido.cliente || "Sin cliente",
      metodoPago,
      origen:        "pedido",
      pedidoId:      pedido.fireId,
      items:         [{ nombre: pedido.nombre, cantidad: 1, precio: parseFloat(pedido.precio||0) }],
      total:         parseFloat(pedido.precio||0),
      creadoEn:      new Date().toISOString(),
    });
    // 3. Si es cuenta corriente, sumar al saldo del cliente
    if (metodoPago === "Cuenta Corriente" && pedido.clienteId) {
      const clSnap = await getDoc(doc(db, "clientes", pedido.clienteId));
      if (clSnap.exists()) {
        const nuevoSaldo = (parseFloat(clSnap.data().saldoCuenta)||0) + parseFloat(pedido.precio||0);
        await updateDoc(doc(db, "clientes", pedido.clienteId), { saldoCuenta: nuevoSaldo });
      }
    }
    setEntregaModal(null);
    showToast(`Pedido entregado · $${parseFloat(pedido.precio||0).toLocaleString("es-AR")} registrado en Finanzas ✅`);
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
    border:`1.5px solid ${errors[field]?"#ef5350":"#f0d5c0"}`,
    fontSize:14, fontFamily:"'DM Sans',sans-serif", background:"#fff",
    color:"#1a2340", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s"
  });

  if (!authChecked) return (
    <div style={{ minHeight:"100vh", background:"#fff8f5", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:28, fontWeight:700, color:"#e65100", marginBottom:12 }}>Mafalda Gráfica</div>
      <div style={{ fontSize:14, color:"#a09080" }}>Iniciando...</div>
    </div>
  );

  if (!user) return <LoginScreen />;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#fff8f5", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:28, fontWeight:700, color:"#e65100", marginBottom:12 }}>Mafalda Gráfica</div>
      <div style={{ fontSize:14, color:"#a09080" }}>Cargando pedidos...</div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", color:"#1a2340", minHeight:"100vh", width:"100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}#root{width:100%;min-height:100vh;display:flex;flex-direction:column}
        html,body,#root{margin:0;padding:0;width:100%;min-height:100vh;overflow-x:hidden}body{background:#fff8f5}
        input:focus,select:focus,textarea:focus{border-color:#e65100!important;box-shadow:0 0 0 3px rgba(230,81,0,.1)}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#c5cce0;border-radius:3px}
        .btn-p{background:#e65100;color:#fff;border:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .18s}
        .btn-p:hover{background:#bf360c;transform:translateY(-1px);box-shadow:0 4px 14px rgba(230,81,0,.25)}
        .btn-g{background:transparent;color:#e65100;border:1.5px solid #e65100;padding:9px 20px;border-radius:8px;font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .18s}
        .btn-g:hover{background:#fff3e0}
        .btn-d{background:#ef5350;color:#fff;border:none;padding:7px 12px;border-radius:7px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer}
        .btn-d:hover{background:#c62828}
        .btn-imp{background:#e65100;color:#fff;border:none;padding:7px 13px;border-radius:7px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .18s}
        .btn-imp:hover{background:#bf360c;box-shadow:0 3px 10px rgba(230,81,0,.3)}
        .card{background:#fff;border-radius:14px;box-shadow:0 2px 14px rgba(230,81,0,.07)}
        .nav-lnk{padding:8px 18px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;transition:all .18s;color:rgba(255,255,255,.75)}
        .nav-lnk:hover{background:rgba(255,255,255,.15);color:#fff}
        .nav-lnk.act{background:rgba(255,255,255,.2);color:#fff;font-weight:700}
        .row-h:hover{background:#f5f7fd!important;cursor:pointer}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .cat-tog:hover{background:#fff8f5}
        .est-sel{padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;border:1.5px solid #f0d5c0;cursor:pointer;background:#fff}
        .modal-ov{position:fixed;inset:0;background:rgba(17,31,107,.45);z-index:600;display:flex;align-items:center;justify-content:center;animation:fIn .2s ease}
        .modal-bx{background:#fff;border-radius:16px;padding:36px 32px;max-width:430px;width:90%;box-shadow:0 20px 60px rgba(17,31,107,.25);animation:pIn .25s ease;text-align:center}
        .msg-bx{background:#fff;border-radius:16px;padding:36px 32px;max-width:500px;width:92%;box-shadow:0 20px 60px rgba(17,31,107,.25);animation:pIn .25s ease}
        .msg-textarea{width:100%;border:2px solid #dde3ef;border-radius:10px;padding:14px 16px;font-size:15px;font-family:'DM Sans',sans-serif;color:#1a2340;line-height:1.6;resize:none;outline:none;transition:border-color .2s;background:#fffaf7}
        .msg-textarea:focus{border-color:#e65100;background:#fff}
        .btn-copy{background:#25d366;color:#fff;border:none;padding:11px 24px;border-radius:9px;font-size:15px;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .18s}
        .btn-copy:hover{background:#1da851;box-shadow:0 3px 12px rgba(37,211,102,.35)}
        .btn-copy.copied{background:#2e7d32}
        @keyframes fIn{from{opacity:0}to{opacity:1}}
        @keyframes pIn{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
        /* ── Responsive ── */
        /* ── Sidebar layout ── */
        .app-shell{display:flex;min-height:100vh;width:100%;position:relative}
        .sidebar{width:220px;min-height:100vh;background:linear-gradient(180deg,#bf360c 0%,#e65100 100%);display:flex;flex-direction:column;transition:width .25s cubic-bezier(.4,0,.2,1);flex-shrink:0;position:relative;z-index:100;box-shadow:4px 0 20px rgba(191,54,12,.25)}
        .sidebar.collapsed{width:64px}
        .sidebar-logo{display:flex;align-items:center;gap:10px;padding:18px 14px 14px;border-bottom:1px solid rgba(255,255,255,.15);min-height:70px;overflow:hidden}
        .sidebar-logo img{height:38px;object-fit:contain;border-radius:6px;flex-shrink:0}
        .sidebar-logo-txt{overflow:hidden;white-space:nowrap}
        .sidebar-logo-name{font-family:"DM Sans",sans-serif;font-size:16px;font-weight:800;color:#fff;line-height:1.2}
        .sidebar-logo-sub{font-size:9px;color:rgba(255,255,255,.55);letter-spacing:1px;text-transform:uppercase}
        .sidebar-toggle{display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:rgba(255,255,255,.15);border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:14px;flex-shrink:0;transition:background .18s;margin-left:auto}
        .sidebar-toggle:hover{background:rgba(255,255,255,.25)}
        .sidebar-nav{flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:3px;overflow-y:auto;overflow-x:hidden}
        .sidebar-item{display:flex;align-items:center;gap:12px;padding:10px 10px;border-radius:10px;cursor:pointer;transition:all .18s;color:rgba(255,255,255,.75);white-space:nowrap;overflow:hidden;font-size:14px;font-weight:500;font-family:"DM Sans",sans-serif;border:none;background:transparent;width:100%;text-align:left}
        .sidebar-item:hover{background:rgba(255,255,255,.15);color:#fff}
        .sidebar-item.act{background:rgba(255,255,255,.22);color:#fff;font-weight:700}
        .sidebar-item.finanzas-item{background:rgba(255,255,255,.12);margin-top:auto}
        .sidebar-item.finanzas-item.act{background:rgba(255,255,255,.25)}
        .sidebar-icon{font-size:18px;flex-shrink:0;width:22px;text-align:center}
        .sidebar-label{overflow:hidden;transition:opacity .2s,max-width .25s;max-width:160px;opacity:1}
        .collapsed .sidebar-label{max-width:0;opacity:0}
        .sidebar-bottom{padding:10px 8px;border-top:1px solid rgba(255,255,255,.15)}
        .sidebar-badge{background:#f57f17;color:#fff;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-left:auto;flex-shrink:0}
        .main-area{flex:1;display:flex;flex-direction:column;min-width:0;background:#fff8f5;overflow-x:hidden}
        .topbar{height:58px;background:#fff;border-bottom:1px solid #f0d5c0;display:flex;align-items:center;padding:0 24px;gap:12px;box-shadow:0 1px 8px rgba(230,81,0,.06);flex-shrink:0}
        .topbar-title{font-family:"DM Sans",sans-serif;font-size:18px;font-weight:700;color:#1a2340;flex:1}
        .main-content{padding:24px 28px;flex:1}
        .grid-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
        .grid-2col{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .grid-nueva-venta{display:grid;grid-template-columns:1fr 420px;gap:20px;align-items:start}
        .grid-agenda{display:grid;grid-template-columns:1fr 300px;gap:20px;align-items:start}
        .busq-global-overlay{position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.4)}
        .busq-global-box{position:fixed;top:70px;left:50%;transform:translateX(-50%);width:min(600px,92vw);background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.2);z-index:401;overflow:hidden}
        .busq-global-input{width:100%;padding:16px 20px;font-size:16px;border:none;outline:none;font-family:"DM Sans",sans-serif;color:#1a2340}
        .busq-global-result{padding:11px 20px;cursor:pointer;border-top:1px solid #fef0e8;display:flex;align-items:center;gap:12px;transition:background .15s}
        .busq-global-result:hover{background:#fff8f5}
        .ctx-btn{background:rgba(230,81,0,.1);color:#e65100;border:1.5px solid rgba(230,81,0,.3);padding:7px 14px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:"DM Sans",sans-serif;transition:all .18s}
        .ctx-btn:hover{background:#e65100;color:#fff}
        @media(max-width:900px){
          .sidebar{position:fixed;top:0;left:0;height:100vh;z-index:200;transform:translateX(0)}
          .sidebar.collapsed{width:0;overflow:hidden}
          .main-area{margin-left:0}
          .main-content{padding:16px}
          .grid-stats{grid-template-columns:repeat(2,1fr)}
          .grid-2col{grid-template-columns:1fr}
          .grid-nueva-venta{grid-template-columns:1fr}
          .grid-agenda{grid-template-columns:1fr}
        }
        @media(max-width:480px){
          .grid-stats{grid-template-columns:1fr 1fr}
          .main-content{padding:12px}
        }
      `}</style>

      {/* ── SIDEBAR + MAIN LAYOUT ── */}
      <div className="app-shell">

        {/* ── SIDEBAR ── */}
        <aside className={`sidebar${menuAbierto?"":" collapsed"}`}>
          {/* Logo */}
          <div className="sidebar-logo">
            {empresa.logo
              ? <img src={empresa.logo} alt="Logo" style={{ height:38, maxWidth:120, objectFit:"contain", borderRadius:6, flexShrink:0 }}/>
              : <span className="sidebar-icon" style={{ fontSize:26 }}>🖨️</span>
            }
            <div className="sidebar-logo-txt">
              <div className="sidebar-logo-name">{empresa.nombre||"Mafalda"}</div>
              <div className="sidebar-logo-sub">Gestión</div>
            </div>
            <button className="sidebar-toggle" onClick={()=>setMenuAbierto(m=>!m)} title={menuAbierto?"Colapsar menú":"Expandir menú"}>
              {menuAbierto?"◀":"▶"}
            </button>
          </div>

          {/* Nav items */}
          <nav className="sidebar-nav">
            <button className={`sidebar-item ${(view==="lista"||view==="listos"||view==="formulario"||view==="detalle")?"act":""}` + ""} onClick={()=>{ setView("lista"); }}>
              <span className="sidebar-icon">📋</span>
              <span className="sidebar-label">Pedidos</span>
            </button>
            <button className={`sidebar-item ${(view==="clientes"||view==="nuevoCliente"||view==="editarCliente")?"act":""}` + ""} onClick={()=>{ setView("clientes"); }}>
              <span className="sidebar-icon">👥</span>
              <span className="sidebar-label">Clientes</span>
            </button>
            <button className={`sidebar-item ${(view==="insumos"||view==="nuevoInsumo"||view==="editarInsumo")?"act":""}` + ""} onClick={()=>{ setView("insumos"); }}>
              <span className="sidebar-icon">📦</span>
              <span className="sidebar-label">Insumos</span>
            </button>
            <button className={`sidebar-item ${(view==="ventas"||view==="nuevaVenta")?"act":""}` + ""} onClick={()=>{ setView("ventas"); }}>
              <span className="sidebar-icon">💰</span>
              <span className="sidebar-label">Ventas</span>
            </button>
            <button className={`sidebar-item ${(view==="agenda")?"act":""}` + ""} onClick={()=>{ setView("agenda"); }}>
              <span className="sidebar-icon">📅</span>
              <span className="sidebar-label">Agenda</span>
            </button>
            <button className={`sidebar-item ${(view==="proveedores"||view==="nuevoProveedor"||view==="editarProveedor")?"act":""}` + ""} onClick={()=>{ setView("proveedores"); }}>
              <span className="sidebar-icon">🏭</span>
              <span className="sidebar-label">Proveedores</span>
            </button>
            <button className={`sidebar-item ${(view==="config")?"act":""}` + ""} onClick={()=>{ setView("config"); }}>
              <span className="sidebar-icon">⚙️</span>
              <span className="sidebar-label">Configuración</span>
            </button>

            {/* Listos badge */}
            {(view==="lista"||view==="listos"||view==="formulario"||view==="detalle") && pedidos.filter(p=>p.estado==="Listo").length > 0 && (
              <button className={`sidebar-item ${view==="listos"?"act":""}`} onClick={()=>setView("listos")} style={{ marginTop:-2 }}>
                <span className="sidebar-icon">✅</span>
                <span className="sidebar-label">Listos</span>
                <span className="sidebar-badge">{pedidos.filter(p=>p.estado==="Listo").length}</span>
              </button>
            )}
          </nav>

          {/* Finanzas al fondo */}
          <div className="sidebar-bottom">
            <button className={`sidebar-item finanzas-item ${view==="finanzas"?"act":""}`} onClick={()=>setView("finanzas")}>
              <span className="sidebar-icon">💼</span>
              <span className="sidebar-label">Finanzas</span>
            </button>
            <button className="sidebar-item" onClick={handleLogout} style={{ marginTop:4 }}>
              <span className="sidebar-icon">🔒</span>
              <span className="sidebar-label">Salir</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN AREA ── */}
        <div className="main-area">

          {/* Topbar */}
          <div className="topbar">
            {/* Toggle en mobile */}
            <button onClick={()=>setMenuAbierto(m=>!m)}
              style={{ background:"transparent", border:"none", color:"#e65100", fontSize:20, cursor:"pointer", padding:"4px 6px", borderRadius:6, marginRight:4, display:"none" }}
              className="mobile-menu-btn">
              ☰
            </button>
            <div className="topbar-title">
              {view==="lista" ? "📋 Pedidos" :
          view==="listos" ? "📋 Pedidos" :
          view==="formulario" ? "📋 Pedidos" :
          view==="detalle" ? "📋 Pedidos" :
          view==="clientes" ? "👥 Clientes" :
          view==="nuevoCliente" ? "👥 Clientes" :
          view==="editarCliente" ? "👥 Clientes" :
          view==="insumos" ? "📦 Insumos" :
          view==="nuevoInsumo" ? "📦 Insumos" :
          view==="editarInsumo" ? "📦 Insumos" :
          view==="ventas" ? "💰 Ventas" :
          view==="nuevaVenta" ? "💰 Ventas" :
          view==="agenda" ? "📅 Agenda" :
          view==="proveedores" ? "🏭 Proveedores" :
          view==="nuevoProveedor" ? "🏭 Proveedores" :
          view==="editarProveedor" ? "🏭 Proveedores" :
          view==="config" ? "⚙️ Configuración" :
          view==="finanzas" ? "💼 Finanzas" :
          "Sistema"}
            </div>

            {/* Botones contextuales en topbar */}
            {(view==="lista"||view==="formulario"||view==="detalle") && (
              <button className="ctx-btn" onClick={()=>{ setFormData(EMPTY_FORM); setEditingId(null); setErrors({}); setSelectedClienteId(null); setClienteSearch(""); setView("formulario"); }}>
                + Nuevo Pedido
              </button>
            )}
            {(view==="clientes"||view==="nuevoCliente") && (
              <button className="ctx-btn" onClick={()=>setView("nuevoCliente")}>➕ Nuevo Cliente</button>
            )}
            {(view==="insumos"||view==="nuevoInsumo") && (
              <button className="ctx-btn" onClick={()=>setView("nuevoInsumo")}>➕ Nuevo Insumo</button>
            )}
            {(view==="ventas"||view==="nuevaVenta") && (
              <button className="ctx-btn" onClick={()=>setView("nuevaVenta")}>➕ Nueva Venta</button>
            )}
            {view==="agenda" && (
              <button className="ctx-btn" onClick={()=>setNuevoEventoModal(true)}>➕ Nuevo Evento</button>
            )}
            {(view==="proveedores"||view==="nuevoProveedor") && (
              <button className="ctx-btn" onClick={()=>setView("nuevoProveedor")}>➕ Nuevo Proveedor</button>
            )}

            {/* Buscador global */}
            <button onClick={()=>setBusqGlobalOpen(true)}
              style={{ background:"rgba(230,81,0,.08)", border:"1.5px solid rgba(230,81,0,.2)", color:"#e65100", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", gap:6, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
              🔍 <span style={{ fontSize:13 }}>Buscar</span>
            </button>

            {!configCargada && (
              <span style={{ fontSize:11, color:"#a09080", display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#ffb74d", display:"inline-block", animation:"pulse 1s infinite" }}></span>
              </span>
            )}
          </div>

          {/* Buscador Global */}
          {busqGlobalOpen && (
            <BuscadorGlobal
              pedidos={pedidos}
              clientes={clientes}
              busqueda={busquedaGlobal}
              setBusqueda={setBusquedaGlobal}
              onClose={() => { setBusqGlobalOpen(false); setBusquedaGlobal(""); }}
              onSelectPedido={(p) => { setSelectedPedido(p); setView("detalle"); setBusqGlobalOpen(false); setBusquedaGlobal(""); }}
              onSelectCliente={() => { setView("clientes"); setBusqGlobalOpen(false); setBusquedaGlobal(""); }}
              ESTADO_COLOR={ESTADO_COLOR}
              CATEGORIA_COLOR={CATEGORIA_COLOR}
              CATEGORIA_ICON={CATEGORIA_ICON}
            />
          )}

          <div className="main-content" onClick={()=>{ if(window.innerWidth<=900) setMenuAbierto(false); }}>


        {/* STATS — solo en pestaña Pedidos */}
        {(view==="lista"||view==="listos"||view==="formulario"||view==="detalle") && (
          <div style={{ marginBottom:26 }}>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
              <button onClick={() => setShowStats(s=>!s)}
                style={{ background:"transparent", border:"none", fontSize:12, color:"#a09080", cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontFamily:"'DM Sans',sans-serif", padding:"4px 8px", borderRadius:6, transition:"all .18s" }}
                onMouseOver={e=>e.currentTarget.style.color="#e65100"}
                onMouseOut={e=>e.currentTarget.style.color="#a09080"}>
                {showStats ? "▲ Ocultar resumen" : "▼ Mostrar resumen"}
              </button>
            </div>
            {showStats && (
              <div className="grid-stats">
                {[
                  { label:"Activos",            value:stats.total,      icon:"📁", color:"#e65100" },
                  { label:"Pendientes",         value:stats.pendiente,  icon:"⏳", color:"#616161" },
                  { label:"En Producción",      value:stats.produccion, icon:"⚙️", color:"#bf360c" },
                  { label:"Listos p/ entregar", value:stats.listo,      icon:"✅", color:"#f57f17" },
                ].map((s,i) => (
                  <div key={i} className="card" style={{ padding:"16px 18px" }}>
                    <div style={{ fontSize:10, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", marginBottom:7 }}>{s.label}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:28, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                      <div style={{ fontSize:22, opacity:.75 }}>{s.icon}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                    background: vistaLista===v.id ? "#e65100" : "#fff",
                    color:      vistaLista===v.id ? "#fff"    : "#4a5568",
                    boxShadow:  vistaLista===v.id ? "0 3px 12px rgba(230,81,0,.25)" : "0 2px 8px rgba(230,81,0,.07)" }}>
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
                <div style={{ marginLeft:"auto", fontSize:13, color:"#a09080" }}>{filtered.length} pedido{filtered.length!==1?"s":""}</div>
              </div>
            )}

            {/* Vista: Categorías */}
            {vistaLista === "categorias" && (
              !Object.keys(grouped).length ? (
                <div className="card" style={{ padding:"52px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:14 }}>📭</div>
                  <div style={{ fontWeight:700, fontSize:18, fontFamily:"'DM Sans',sans-serif", marginBottom:6 }}>Sin pedidos</div>
                  <div style={{ color:"#a09080", fontSize:14 }}>Cargá un nuevo pedido con el botón de arriba</div>
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
                        <span style={{ fontSize:12, color:"#a09080" }}>📅 Próx. entrega: <strong style={{ color:"#1a2340" }}>{items[0]?.fechaEntrega||"—"}</strong></span>
                        <span style={{ fontSize:16, color:"#a09080", display:"inline-block", transform:exp?"rotate(0)":"rotate(-90deg)", transition:"transform .2s" }}>▾</span>
                      </div>
                    </div>
                    {exp && (
                      <div style={{ overflowX:"auto" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
                          <thead>
                            <tr style={{ background:"#fffaf7" }}>
                              {["Pedido","Cliente","Estado","Fecha Entrega","Total","Saldo",""].map(h => (
                                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontWeight:600, fontSize:11, color:"#8a7060", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap", borderBottom:"1px solid #edf0f7" }}>{h}</th>
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
                                    {p.notas && <div style={{ fontSize:11, color:"#a09080", marginTop:2, maxWidth:210, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.notas}</div>}
                                  </td>
                                  <td style={{ padding:"12px 16px", color:"#4a5568", whiteSpace:"nowrap" }}>
                                    <div>{p.cliente}</div>
                                    {p.telefono && <div style={{ fontSize:12, fontWeight:700, color:"#e65100", marginTop:2, display:"flex", alignItems:"center", gap:3 }}>📞 {p.telefono}</div>}
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
          <div className="card" style={{ padding:"32px 36px" }}>
            <div style={{ marginBottom:26 }}>
              <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:"#1a2340", marginBottom:4 }}>
                {editingId?"✏️ Editar Pedido":"📥 Nuevo Pedido"}
              </h2>
              <p style={{ fontSize:14, color:"#a09080" }}>{editingId?"Modificá los datos del pedido.":"Completá el formulario para registrar el pedido."}</p>
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

              <div style={{ position:"relative", gridColumn:"1 / -1" }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#4a5568", marginBottom:6 }}>Cliente *</label>
                {selectedClienteId ? (
                  (() => {
                    const cl = clientes.find(c => c.fireId === selectedClienteId);
                    return cl ? (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:8, border:"1.5px solid #e65100", background:"#fff8f5" }}>
                        <div>
                          <div style={{ fontWeight:700, color:"#1a2340", fontSize:14 }}>{cl.nombre} {cl.apellido} {cl.empresa && `— ${cl.empresa}`}</div>
                          <div style={{ fontSize:12, color:"#e65100", fontWeight:600, marginTop:2 }}>📞 {cl.telefono || "Sin teléfono"}</div>
                        </div>
                        <button onClick={() => { setSelectedClienteId(null); setFormData(p=>({...p,cliente:"",telefono:""})); setClienteSearch(""); }}
                          style={{ background:"#ffebee", border:"none", color:"#c62828", padding:"5px 10px", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:600 }}>
                          ✕ Cambiar
                        </button>
                      </div>
                    ) : null;
                  })()
                ) : (
                  <div style={{ position:"relative" }}>
                    <input
                      value={clienteSearch}
                      onChange={e => { setClienteSearch(e.target.value); setFormData(p=>({...p,cliente:e.target.value})); setClienteDropdown(true); }}
                      onFocus={() => setClienteDropdown(true)}
                      placeholder="Buscar cliente o escribir nuevo..."
                      style={{ ...inp("cliente"), paddingRight:40 }}
                      autoComplete="off"
                    />
                    <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:16 }}>🔍</span>
                    {clienteDropdown && (clienteSearch.length > 0) && (
                      <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1.5px solid #f0d5c0", borderRadius:8, boxShadow:"0 8px 24px rgba(230,81,0,.12)", zIndex:100, maxHeight:220, overflowY:"auto", marginTop:4 }}>
                        {clientes.filter(c => {
                          const q = clienteSearch.toLowerCase();
                          return `${c.nombre} ${c.apellido} ${c.empresa||""} ${c.telefono||""}`.toLowerCase().includes(q);
                        }).map(cl => (
                          <div key={cl.fireId}
                            onClick={() => {
                              setSelectedClienteId(cl.fireId);
                              setFormData(p=>({...p, cliente:`${cl.nombre} ${cl.apellido}`.trim(), telefono: cl.telefono||""}));
                              setClienteDropdown(false);
                              setClienteSearch(`${cl.nombre} ${cl.apellido}`.trim());
                            }}
                            style={{ padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid #fef0e8", display:"flex", alignItems:"center", justifyContent:"space-between" }}
                            onMouseOver={e=>e.currentTarget.style.background="#fff8f5"}
                            onMouseOut={e=>e.currentTarget.style.background="#fff"}>
                            <div>
                              <div style={{ fontWeight:600, fontSize:13, color:"#1a2340" }}>{cl.nombre} {cl.apellido} {cl.empresa&&<span style={{color:"#a09080",fontWeight:400}}>— {cl.empresa}</span>}</div>
                              {cl.telefono && <div style={{ fontSize:11, color:"#e65100", fontWeight:600 }}>📞 {cl.telefono}</div>}
                            </div>
                            <span style={{ fontSize:11, color:"#a09080" }}>Seleccionar →</span>
                          </div>
                        ))}
                        <div
                          onClick={() => { setView("nuevoCliente"); setFormData(p=>({...p,_volver:"formulario"})); }}
                          style={{ padding:"10px 14px", cursor:"pointer", background:"#fff8f5", color:"#e65100", fontWeight:700, fontSize:13, borderTop:"1.5px solid #f0d5c0", display:"flex", alignItems:"center", gap:6 }}>
                          ➕ Crear cliente "{clienteSearch}"
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                  <div style={{ marginTop:6, fontSize:12, color:"#bf360c", background:"#fff3e0", borderRadius:6, padding:"5px 10px" }}>
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
                <div style={{ gridColumn:"1 / -1", background:"#fff8f5", borderRadius:10, padding:"12px 18px", display:"flex", gap:24 }}>
                  <div><span style={{ fontSize:12, color:"#a09080" }}>Total: </span><strong>${parseFloat(formData.precio||0).toLocaleString("es-AR")}</strong></div>
                  <div><span style={{ fontSize:12, color:"#a09080" }}>Seña: </span><strong style={{ color:"#2e7d32" }}>${parseFloat(formData.seña||0).toLocaleString("es-AR")}</strong></div>
                  <div><span style={{ fontSize:12, color:"#a09080" }}>Saldo: </span><strong style={{ color:saldo(formData)>0?"#c62828":"#2e7d32" }}>${saldo(formData).toLocaleString("es-AR")}</strong></div>
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
              <button className="btn-g" onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setErrors({}); setSelectedClienteId(null); setClienteSearch(""); setView("lista"); }}>Cancelar</button>
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
                  <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:26, fontWeight:700, color:"#1a2340", marginBottom:8 }}>{p.nombre}</h2>
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
                  <div key={item.label} style={{ background:"#fffaf7", borderRadius:10, padding:"13px 16px" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", marginBottom:4 }}>{item.icon} {item.label}</div>
                    <div style={{ fontWeight:600, color:"#1a2340" }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background:"#fff8f5", borderRadius:12, padding:"18px 20px", marginBottom:16, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                {[
                  { label:"Precio Total",    value:`$${parseFloat(p.precio||0).toLocaleString("es-AR")}`, color:"#1a2340" },
                  { label:"Seña / Adelanto", value:`$${parseFloat(p.seña||0).toLocaleString("es-AR")}`,   color:"#2e7d32" },
                  { label:"Saldo Pendiente", value:`$${saldo(p).toLocaleString("es-AR")}`,                color:saldo(p)>0?"#c62828":"#2e7d32" },
                ].map(f => (
                  <div key={f.label} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", marginBottom:5 }}>{f.label}</div>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:f.color }}>{f.value}</div>
                  </div>
                ))}
              </div>

              {p.notas && (
                <div style={{ background:"#fffaf7", borderRadius:10, padding:"16px 18px" }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", marginBottom:7 }}>📝 Notas</div>
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

        {/* ── CLIENTES ── */}
        {view==="clientes" && (
          <ClientesView
            clientes={clientes}
            pedidos={pedidos}
            setView={setView}
            setFormData={setFormData}
            setEditingClienteId={setEditingClienteId}
            showToast={showToast}
          />
        )}

        {/* ── NUEVO / EDITAR CLIENTE ── */}
        {(view==="nuevoCliente" || view==="editarCliente") && (
          <FormularioCliente
            view={view}
            editingClienteId={editingClienteId}
            clientes={clientes}
            pedidos={pedidos}
            setView={setView}
            setSelectedClienteId={setSelectedClienteId}
            setClienteSearch={setClienteSearch}
            setFormData={setFormData}
            formData={formData}
            showToast={showToast}
          />
        )}

        {/* ── INSUMOS ── */}
        {view==="insumos" && (
          <InsumosView
            setView={setView}
            showToast={showToast}
          />
        )}
        {(view==="nuevoInsumo"||view==="editarInsumo") && (
          <FormularioInsumo
            view={view}
            editingInsumoId={editingInsumoId}
            setView={setView}
            showToast={showToast}
          />
        )}

        {/* ── VENTAS ── */}
        {view==="ventas" && (
          <VentasView setView={setView} showToast={showToast} clientes={clientes} empresa={empresa} configCargada={configCargada} />
        )}
        {view==="nuevaVenta" && (
          <NuevaVentaView setView={setView} showToast={showToast} clientes={clientes} empresa={empresa} configCargada={configCargada} />
        )}

        {/* ── AGENDA ── */}
        {view==="agenda" && (
          <AgendaView
            nuevoEventoModal={nuevoEventoModal}
            setNuevoEventoModal={setNuevoEventoModal}
            showToast={showToast}
          />
        )}

        {/* ── PROVEEDORES ── */}
        {(view==="proveedores"||view==="nuevoProveedor"||view==="editarProveedor") && (
          <ProveedoresView
            view={view}
            setView={setView}
            showToast={showToast}
          />
        )}

        {/* ── FINANZAS ── */}
        {view==="finanzas" && (
          <FinanzasView
            pedidos={pedidos}
            clientes={clientes}
            desbloqueado={finanzasDesbloqueado}
            setDesbloqueado={setFinanzasDesbloqueado}
            showToast={showToast}
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

      {msgModal && (
        <MsgModal
          pedido={msgModal.pedido}
          copied={copied}
          setCopied={setCopied}
          onClose={() => setMsgModal(null)}
        />
      )}

      {entregaModal && (
        <EntregaModal
          pedido={entregaModal.pedido}
          onConfirmar={confirmarEntrega}
          onClose={() => setEntregaModal(null)}
        />
      )}

      {/* ── MODAL IMPRESIÓN AUTOMÁTICA ── */}
      {printModal && (
        <div className="modal-ov" onClick={() => setPrintModal(null)}>
          <div className="modal-bx" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:52, marginBottom:14 }}>🖨️</div>
            <h3 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, color:"#1a2340", marginBottom:8 }}>
              ¡Pedido en Producción!
            </h3>
            <p style={{ fontSize:15, color:"#1a2340", fontWeight:600, marginBottom:4 }}>{printModal.pedido.nombre}</p>
            <p style={{ fontSize:14, color:"#a09080", marginBottom:28 }}>¿Querés imprimir la orden de trabajo ahora?</p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button className="btn-g" style={{ padding:"10px 24px" }} onClick={() => setPrintModal(null)}>Ahora no</button>
              <button className="btn-imp" style={{ padding:"11px 24px", fontSize:15, borderRadius:9 }}
                onClick={() => { if(!configCargada){alert("Cargando datos del local...");return;} imprimirOrden(printModal.pedido, empresa); setPrintModal(null); }}>
                🖨️ Imprimir orden
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:26, right:26, padding:"13px 20px",
          background:toast.type==="error"?"#ef5350":"#1b5e20",
          color:"#fff", borderRadius:10, fontSize:14, fontWeight:600,
          boxShadow:"0 8px 24px rgba(0,0,0,.2)", zIndex:1000 }}>
          {toast.type==="error"?"🗑 ":"✅ "}{toast.msg}
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
