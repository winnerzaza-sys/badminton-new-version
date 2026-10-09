import { Icon } from "./Icon";

export function ShuttleMark({ hero = false }: { hero?: boolean }) {
  return (
    <span
      className={hero ? "shuttle-mark hero-shuttle" : "shuttle-mark"}
      aria-hidden="true"
    >
      <Icon name="shuttlecock" size={hero ? 64 : 30} />
      {hero && (
        <span className="shuttle-spark">
          <Icon name="sparkles" size={24} />
        </span>
      )}
    </span>
  );
}
