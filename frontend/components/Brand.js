export default function Brand({ light = false }) {
  return <div className={`brand-lockup ${light ? 'brand-light' : ''}`}>
    <span aria-hidden="true" className="brand-mark"><i>B</i><b>↗</b></span>
    <span className="brand-name">BizCard<small>WORKSPACE</small></span>
  </div>;
}
