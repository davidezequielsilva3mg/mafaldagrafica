import { useState, useMemo, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, setDoc, getDoc
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
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a2340}
  .page{width:210mm;min-height:148mm;margin:0 auto;padding:20mm 20mm 16mm}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:13px;border-bottom:3px solid #e65100;margin-bottom:16px}
  .hdr-left{display:flex;align-items:center;gap:14px}
  .logo-img{width:60px;height:60px;object-fit:contain;border-radius:8px}
  .brand{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;color:#e65100}
  .brand-data{font-size:11px;color:#8a7060;margin-top:3px;line-height:1.6}
  .onum{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#e65100;text-align:right}
  .ofecha{font-size:11px;color:#a09080;text-align:right;margin-top:3px}
  .banner{background:#fff3e0;color:#bf360c;text-align:center;padding:7px 0;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px}
  .ped{background:#fff8f5;border-radius:8px;padding:12px 15px;margin-bottom:14px}
  .ped-lbl{font-size:10px;font-weight:600;color:#a09080;text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
  .ped-nom{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:#1a2340}
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
  .fval{font-family:'Playfair Display',serif;font-size:17px;font-weight:700}
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
          <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:16, color:"#1a2340", minWidth:220, textAlign:"center", textTransform:"capitalize" }}>{tituloNavegacion()}</span>
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
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:esHoy?"#e65100":"#1a2340" }}>
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
          <p style={{ fontSize:14, color:"#a09080", marginTop:4 }}>Pedidos finalizados que esperan ser retirados o entregados</p>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"12px 20px", textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", marginBottom:4 }}>Pedidos listos</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#f57f17" }}>{listos.length}</div>
          </div>
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"12px 20px", textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".6px", marginBottom:4 }}>Por cobrar</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:"#c62828" }}>${totalCobrar.toLocaleString("es-AR")}</div>
          </div>
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"14px 18px", marginBottom:18 }}>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:15 }}>🔍</span>
          <input placeholder="Buscar por pedido o cliente..." value={busqL} onChange={e => setBusqL(e.target.value)}
            style={{ ...inp(), paddingLeft:34, width:"100%" }}/>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"52px 24px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:14 }}>🎉</div>
          <div style={{ fontWeight:700, fontSize:18, fontFamily:"'Playfair Display',serif", marginBottom:6 }}>
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
                {["Pedido","Categoría","Cliente","Fecha Entrega","Total","Saldo","Acciones"].map(h => (
                  <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontWeight:600, fontSize:11, color:"#8a7060", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap", borderBottom:"1px solid #edf0f7" }}>{h}</th>
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
                      {p.notas && <div style={{ fontSize:11, color:"#a09080", marginTop:2, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.notas}</div>}
                    </td>
                    <td style={{ padding:"13px 16px" }}>
                      <span style={{ background:cc.bg, color:cc.text, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{CATEGORIA_ICON[p.categoria]} {p.categoria}</span>
                    </td>
                    <td style={{ padding:"13px 16px", color:"#4a5568", whiteSpace:"nowrap" }}>
                      <div style={{ fontWeight:600 }}>{p.cliente}</div>
                      {p.telefono && <div style={{ fontSize:12, fontWeight:700, color:"#e65100", marginTop:2, display:"flex", alignItems:"center", gap:3 }}>📞 {p.telefono}</div>}
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
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
              <thead>
                <tr style={{ background:"#fffaf7" }}>
                  {["Pedido","Categoría","Cliente","Fecha Entrega","Total","Estado"].map(h => (
                    <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontWeight:600, fontSize:11, color:"#8a7060", textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap", borderBottom:"1px solid #edf0f7" }}>{h}</th>
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
        style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"1.5px solid #f0d5c0", fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"#1a2340", outline:"none", boxSizing:"border-box" }}/>
    </div>
  );

  return (
    <div style={{ maxWidth:760, margin:"0 auto" }}>
      <div style={{ marginBottom:26 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#1a2340", marginBottom:4 }}>⚙️ Configuración del Local</h2>
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
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"#e65100" }}>{form.nombre||"Nombre del local"}</div>
                <div style={{ fontSize:11, color:"#8a7060", marginTop:3, lineHeight:1.7 }}>
                  {form.titular   && <div>Titular: {form.titular}</div>}
                  {form.cuit      && <div>CUIT: {form.cuit}</div>}
                  {form.direccion && <div>📍 {form.direccion}</div>}
                  {form.telefono  && <div>📞 {form.telefono}</div>}
                </div>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"#e65100" }}>OT-0001</div>
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{ background:"#fff", borderRadius:20, padding:"48px 44px", width:"100%", maxWidth:420, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }}>
        {/* Logo / título */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, color:"#e65100", marginBottom:6 }}>Mafalda Gráfica</div>
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

// ── Componente: Insumos ───────────────────────────────────────────────────
function InsumosView({ setView, showToast }) {
  const [insumos, setInsumos]         = useState([]);
  const [busq, setBusq]               = useState("");
  const [filtroCat, setFiltroCat]     = useState("Todas");
  const [importModal, setImportModal] = useState(false);
  const [importData, setImportData]   = useState([]);
  const [importing, setImporting]     = useState(false);
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
    const q = busq.toLowerCase();
    return (!busq || i.nombre?.toLowerCase().includes(q) || i.codigo?.toLowerCase().includes(q))
      && (filtroCat === "Todas" || i.categoria === filtroCat);
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
    const batch = importData.slice(0, 500); // Firebase limit safety
    for (const ins of batch) {
      await addDoc(collection(db, "insumos"), ins);
    }
    setImportModal(false);
    setImporting(false);
    showToast(`✅ ${batch.length} insumos importados correctamente`);
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
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#1a2340" }}>📦 Insumos</h2>
          <p style={{ fontSize:14, color:"#a09080", marginTop:4 }}>{insumos.length} insumos · {filtrados.length} mostrados</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
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
          <div style={{ fontWeight:700, fontSize:18, fontFamily:"'Playfair Display',serif", marginBottom:6 }}>{busq||filtroCat!=="Todas"?"Sin resultados":"No hay insumos aún"}</div>
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
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:"#1a2340", marginBottom:6 }}>📥 Vista previa de importación</div>
            <div style={{ fontSize:13, color:"#a09080", marginBottom:20 }}>{importData.length} productos encontrados en la pestaña "Precios final"</div>
            <div style={{ maxHeight:320, overflowY:"auto", borderRadius:8, border:"1px solid #f0d5c0", marginBottom:20 }}>
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
                {importing ? "Importando..." : `✅ Importar ${importData.length} insumos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar inline */}
      {editModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }} onClick={() => setEditModal(null)}>
          <div style={{ background:"#fff", borderRadius:16, padding:"28px 32px", width:"100%", maxWidth:500, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"#1a2340", marginBottom:20 }}>✏️ Editar Insumo</div>
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
    <div style={{ maxWidth:680, margin:"0 auto" }}>
      <button onClick={() => setView("insumos")} style={{ background:"transparent", border:"none", color:"#e65100", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>← Volver</button>
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"32px 36px" }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:"#1a2340", marginBottom:4 }}>➕ Nuevo Insumo</h2>
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
      <div style={{ maxWidth:900, margin:"0 auto" }}>
        <button onClick={() => setSelected(null)} style={{ background:"transparent", border:"none", color:"#e65100", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>← Volver a clientes</button>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
          {/* Ficha */}
          <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"24px 28px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:"#1a2340" }}>{cl.nombre} {cl.apellido}</div>
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
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700, color:saldo>0?"#c62828":"#2e7d32", marginBottom:16 }}>
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
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, color:"#1a2340" }}>
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
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:"#1a2340", marginBottom:6 }}>💵 Registrar Pago</div>
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
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#1a2340" }}>👥 Clientes</h2>
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
          <div style={{ fontWeight:700, fontSize:18, fontFamily:"'Playfair Display',serif", marginBottom:6 }}>{busq?"Sin resultados":"No hay clientes aún"}</div>
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
    <div style={{ maxWidth:700, margin:"0 auto" }}>
      <button onClick={() => setView(esEdicion?"clientes":"clientes")} style={{ background:"transparent", border:"none", color:"#e65100", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>← Volver</button>
      <div style={{ background:"#fff", borderRadius:14, boxShadow:"0 2px 14px rgba(230,81,0,.07)", padding:"32px 36px" }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:"#1a2340", marginBottom:4 }}>
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
  const [vistaLista, setVistaLista]       = useState("categorias");
  const [showStats, setShowStats]         = useState(true);
  const [clientes, setClientes]           = useState([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [editingClienteId, setEditingClienteId]   = useState(null);
  const [editingInsumoId, setEditingInsumoId]     = useState(null);

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
    });
  }, []);

  const handleLogout = () => signOut(auth);

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
      const updated = { ...formData, id: editingId, clienteId: selectedClienteId||prev.clienteId||null };
      const fireId  = prev.fireId;
      await updateDoc(doc(db, "pedidos", fireId), updated);
      showToast("Pedido actualizado correctamente");
      triggerPrintIfNeeded(prev, updated);
      triggerMsgIfNeeded(prev, updated);
    } else {
      const newId = Math.max(...pedidos.map(p => p.id), 0) + 1;
      const nuevo = { ...formData, id: newId, clienteId: selectedClienteId||null };
      await addDoc(collection(db, "pedidos"), nuevo);
      showToast("Pedido cargado exitosamente 🎉");
      triggerPrintIfNeeded(null, nuevo);
      triggerMsgIfNeeded(null, nuevo);
    }
    setFormData(EMPTY_FORM); setEditingId(null); setErrors({}); setSelectedClienteId(null); setClienteSearch(""); setView("lista");
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
    border:`1.5px solid ${errors[field]?"#ef5350":"#f0d5c0"}`,
    fontSize:14, fontFamily:"'DM Sans',sans-serif", background:"#fff",
    color:"#1a2340", outline:"none", boxSizing:"border-box", transition:"border-color 0.2s"
  });

  if (!authChecked) return (
    <div style={{ minHeight:"100vh", background:"#fff8f5", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:"#e65100", marginBottom:12 }}>Mafalda Gráfica</div>
      <div style={{ fontSize:14, color:"#a09080" }}>Iniciando...</div>
    </div>
  );

  if (!user) return <LoginScreen />;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#fff8f5", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:"#e65100", marginBottom:12 }}>Mafalda Gráfica</div>
      <div style={{ fontSize:14, color:"#a09080" }}>Cargando pedidos...</div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:"100vh", background:"#fff8f5", color:"#1a2340" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
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
      `}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#bf360c 0%,#e65100 55%,#ff6d00 100%)", boxShadow:"0 4px 20px rgba(191,54,12,.35)" }}>
        <div style={{ maxWidth:1220, margin:"0 auto", padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:70 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:42, height:42, background:"rgba(255,255,255,.13)", borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🖨️</div>
            <div>
              <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:21, fontWeight:700, color:"#fff", lineHeight:1.1 }}>Mafalda Gráfica</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.55)", letterSpacing:"1px", textTransform:"uppercase" }}>Sistema de Pedidos</div>
            </div>
          </div>
          <nav style={{ display:"flex", alignItems:"center", gap:4 }}>
            {/* Tabs principales */}
            <div className={`nav-lnk ${(view==="lista"||view==="listos"||view==="formulario"||view==="detalle")?"act":""}`} onClick={() => setView("lista")}>📋 Pedidos</div>
            <div className={`nav-lnk ${(view==="clientes"||view==="nuevoCliente"||view==="editarCliente")?"act":""}`} onClick={() => setView("clientes")}>👥 Clientes</div>
            <div className={`nav-lnk ${(view==="insumos"||view==="nuevoInsumo"||view==="editarInsumo")?"act":""}`} onClick={() => setView("insumos")}>📦 Insumos</div>
            <div className={`nav-lnk ${view==="config"?"act":""}`} onClick={() => setView("config")}>⚙️ Configuración</div>

            {/* Separador */}
            <div style={{ width:1, height:24, background:"rgba(255,255,255,.2)", margin:"0 6px" }}></div>

            {/* Botones contextuales — solo visibles en sección Pedidos */}
            {(view==="lista"||view==="listos"||view==="formulario"||view==="detalle") && (
              <>
                <div className={`nav-lnk ${view==="listos"?"act":""}`} onClick={() => setView("listos")} style={{ position:"relative", fontSize:13 }}>
                  ✅ Listos
                  {pedidos.filter(p=>p.estado==="Listo").length > 0 && (
                    <span style={{ position:"absolute", top:2, right:2, background:"#f57f17", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:10, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                      {pedidos.filter(p=>p.estado==="Listo").length}
                    </span>
                  )}
                </div>
                <div style={{ background:"rgba(255,255,255,.9)", color:"#e65100", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", transition:"all .18s" }}
                  onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setErrors({}); setSelectedClienteId(null); setClienteSearch(""); setView("formulario"); }}
                  onMouseOver={e=>e.currentTarget.style.background="#fff"}
                  onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,.9)"}>
                  + Nuevo Pedido
                </div>
              </>
            )}

            {/* Botón Nuevo Cliente — solo visible en sección Clientes */}
            {(view==="clientes"||view==="nuevoCliente"||view==="editarCliente") && (
              <div style={{ background:"rgba(255,255,255,.9)", color:"#e65100", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", transition:"all .18s" }}
                onClick={() => setView("nuevoCliente")}
                onMouseOver={e=>e.currentTarget.style.background="#fff"}
                onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,.9)"}>
                ➕ Nuevo Cliente
              </div>
            )}

            {/* Botones Insumos */}
            {(view==="insumos"||view==="nuevoInsumo"||view==="editarInsumo") && (
              <>
                <div style={{ background:"rgba(255,255,255,.9)", color:"#e65100", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}
                  onClick={() => setView("nuevoInsumo")}
                  onMouseOver={e=>e.currentTarget.style.background="#fff"}
                  onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,.9)"}>
                  ➕ Nuevo Insumo
                </div>
              </>
            )}

            {/* Salir */}
            <div className="nav-lnk" onClick={handleLogout} style={{ marginLeft:4, background:"rgba(255,255,255,.15)", color:"#fff", fontSize:13 }}>🔒 Salir</div>
          </nav>
        </div>
      </div>

      <div style={{ maxWidth:1220, margin:"0 auto", padding:"26px 28px" }}>

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
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
                {[
                  { label:"Activos",            value:stats.total,      icon:"📁", color:"#e65100" },
                  { label:"Pendientes",         value:stats.pendiente,  icon:"⏳", color:"#616161" },
                  { label:"En Producción",      value:stats.produccion, icon:"⚙️", color:"#bf360c" },
                  { label:"Listos p/ entregar", value:stats.listo,      icon:"✅", color:"#f57f17" },
                ].map((s,i) => (
                  <div key={i} className="card" style={{ padding:"16px 18px" }}>
                    <div style={{ fontSize:10, fontWeight:600, color:"#a09080", textTransform:"uppercase", letterSpacing:".7px", marginBottom:7 }}>{s.label}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
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
                  <div style={{ fontWeight:700, fontSize:18, fontFamily:"'Playfair Display',serif", marginBottom:6 }}>Sin pedidos</div>
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
          <div className="card" style={{ padding:"32px 36px", maxWidth:840, margin:"0 auto" }}>
            <div style={{ marginBottom:26 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#1a2340", marginBottom:4 }}>
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
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:f.color }}>{f.value}</div>
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
                  <p style={{ fontSize:13, color:"#a09080", marginTop:3 }}>Copiá el mensaje y enviáselo por WhatsApp</p>
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
            <p style={{ fontSize:14, color:"#a09080", marginBottom:28 }}>¿Querés imprimir la orden de trabajo ahora?</p>
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
