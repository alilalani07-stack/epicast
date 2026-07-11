import clsx from 'clsx';

export default function Section({ id, className, children, container = true, padded = true }) {
  return (
    <section id={id} className={clsx('relative', padded && 'py-24 lg:py-32', className)}>
      {container ? (
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
