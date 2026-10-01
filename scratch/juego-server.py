import io
p='src/app/actions.ts'
s=io.open(p,encoding='utf-8').read()
a='''export async function guardarAparienciaAction(ap: { acento?: string; acentoLibre?: string; estilo?: string; tamanoTexto?: string }): Promise<void> {'''
assert a in s
s=s.replace(a,'''export async function guardarAparienciaAction(ap: { acento?: string; acentoLibre?: string; acentoJuego?: { id: string; color: string }; estilo?: string; tamanoTexto?: string }): Promise<void> {''')
b='''  const acentoLibre = /^(#[0-9a-f]{6})?$/i.test(ap.acentoLibre ?? "") ? (ap.acentoLibre ?? "") : "";'''
assert b in s
s=s.replace(b,b+'''
  // Paleta "desde tu juego": id del juego (solo para marcar cuál está
  // elegido) y el color de su carátula; la paleta se recalcula al cargar.
  const acentoJuego =
    ap.acentoJuego && /^[\w:.-]{1,120}$/.test(ap.acentoJuego.id) && /^#[0-9a-f]{6}$/i.test(ap.acentoJuego.color)
      ? { id: ap.acentoJuego.id, color: ap.acentoJuego.color }
      : undefined;''')
c='''set({ apariencia: { acento, acentoLibre, estilo, tamanoTexto } })'''
assert c in s
s=s.replace(c,'''set({ apariencia: { acento, acentoLibre, ...(acentoJuego ? { acentoJuego } : {}), estilo, tamanoTexto } })''')
io.open(p,'w',encoding='utf-8',newline='\n').write(s)

p='src/app/layout.tsx'
s=io.open(p,encoding='utf-8').read()
a='''              var libre=localStorage.getItem("platinos:acento-libre");
              if(libre){'''
assert a in s
s=s.replace(a,'''              var libre=localStorage.getItem("platinos:acento-libre");
              var juego=JSON.parse(localStorage.getItem("platinos:acento-juego")||"null");
              if(juego&&juego.vars){
                for(var k in juego.vars) if(/^--juego-/.test(k)) document.documentElement.style.setProperty(k, juego.vars[k]);
                document.documentElement.classList.add("accent-juego");
              } else if(libre){''')
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('ok')
