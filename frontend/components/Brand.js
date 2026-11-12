export default function Brand({ light = false }) {
  return (
    <div className={`brand-lockup ${light ? 'brand-light' : ''}`}>
      <span aria-hidden="true" className="brand-mark">
        <i>B</i>
      </span>
      <span className="brand-name">
        BizCard<small>ENTERPRISE</small>
      </span>
    </div>
  );
}
