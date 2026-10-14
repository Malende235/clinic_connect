import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ClinicConnect — Talk to a doctor from home',
}

const features = [
  {
    icon: '💬',
    title: 'Describe your problem',
    desc: 'Write your symptoms and medical history in your own words — no appointment needed.',
  },
  {
    icon: '👨‍⚕️',
    title: 'General doctor reviews it',
    desc: 'A qualified GP reads your case and responds or forwards it to the right specialist.',
  },
  {
    icon: '🔬',
    title: 'Get expert advice',
    desc: 'Specialists weigh in when needed. All replies come back to your personal dashboard.',
  },
  {
    icon: '🔒',
    title: 'Private & secure',
    desc: 'Your data is protected end-to-end. Only you and your care team can see your case.',
  },
]

export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="/">
          <span className="brand-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </span>
          ClinicConnect
        </a>
        <nav className="site-nav">
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="btn" style={{marginTop:0}}>Get started</Link>
        </nav>
      </header>

      <main className="main-content">
        {/* Hero */}
        <section style={{
          textAlign:'center',
          padding:'72px 24px 56px',
          background:'linear-gradient(135deg,#ffffff 0%,#eef5fd 55%,#e4f5f1 100%)',
          borderRadius:'var(--radius)',
          border:'1px solid var(--border)',
          boxShadow:'var(--shadow)',
          marginBottom:'28px',
          position:'relative',
          overflow:'hidden',
        }}>
          <div style={{
            position:'absolute',top:'-60px',right:'-60px',
            width:'280px',height:'280px',
            borderRadius:'50%',
            background:'radial-gradient(circle,rgba(11,92,173,.08) 0%,transparent 70%)',
            pointerEvents:'none',
          }}/>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:'8px',
            background:'var(--primary-soft)',color:'var(--primary)',
            padding:'6px 16px',borderRadius:'100px',
            fontSize:'.82rem',fontWeight:700,letterSpacing:'.04em',
            textTransform:'uppercase',marginBottom:'24px',
          }}>
            ✦ Telemedicine, simplified
          </div>
          <h1 style={{
            fontSize:'clamp(2rem,5vw,3.2rem)',
            fontWeight:800,
            letterSpacing:'-0.04em',
            lineHeight:1.15,
            margin:'0 0 20px',
            color:'var(--text)',
          }}>
            Talk to a doctor<br/>
            <span style={{color:'var(--primary)'}}>from anywhere.</span>
          </h1>
          <p style={{
            maxWidth:'580px',margin:'0 auto 32px',
            color:'var(--muted)',fontSize:'1.1rem',lineHeight:1.6,
          }}>
            Describe your health problem, get a reply from a GP, and reach a specialist
            if you need one — all without leaving your home.
          </p>
          <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <Link href="/signup" className="btn" style={{marginTop:0,padding:'13px 28px',fontSize:'1rem'}}>
              Get started free →
            </Link>
            <Link href="/login" className="btn-alt btn" style={{marginTop:0,padding:'13px 28px',fontSize:'1rem'}}>
              Log in
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="card" style={{marginBottom:'28px'}}>
          <h2 style={{textAlign:'center',marginBottom:'32px'}}>How it works</h2>
          <ol style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',
            gap:'20px',
            listStyle:'none',
            padding:0,margin:0,
          }}>
            {[
              {n:1,t:'Sign up',d:'Create an account in 30 seconds and verify your email.'},
              {n:2,t:'Describe your problem',d:'Fill in your symptoms, duration, and any medicines you take.'},
              {n:3,t:'Doctor reviews it',d:'A GP reads your case and responds or routes it to a specialist.'},
              {n:4,t:'Read the reply',d:'Check your personal dashboard for the doctor\'s answer.'},
            ].map(s=>(
              <li key={s.n} style={{
                background:'var(--surface-alt)',
                borderRadius:'var(--radius-sm)',
                padding:'20px',
                border:'1px solid var(--border)',
              }}>
                <div style={{
                  width:'36px',height:'36px',borderRadius:'50%',
                  background:'var(--primary)',color:'#fff',
                  display:'grid',placeItems:'center',
                  fontWeight:800,fontSize:'1rem',marginBottom:'12px',
                }}>{s.n}</div>
                <strong style={{display:'block',marginBottom:'6px'}}>{s.t}</strong>
                <span style={{color:'var(--muted)',fontSize:'.9rem'}}>{s.d}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Features grid */}
        <section style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',
          gap:'16px',
          marginBottom:'28px',
        }}>
          {features.map(f=>(
            <div key={f.title} className="card" style={{marginBottom:0}}>
              <div style={{fontSize:'2rem',marginBottom:'12px'}}>{f.icon}</div>
              <h3 style={{margin:'0 0 8px',fontSize:'1rem',fontWeight:700,textTransform:'none',color:'var(--text)',letterSpacing:'-0.01em'}}>{f.title}</h3>
              <p style={{margin:0,color:'var(--muted)',fontSize:'.9rem',lineHeight:1.55}}>{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Disclaimer */}
        <p className="muted" style={{textAlign:'center',fontSize:'.85rem',padding:'0 20px'}}>
          ⚠️ Not for emergencies. If you are in danger, call your local emergency number immediately.
        </p>
      </main>
    </>
  )
}
