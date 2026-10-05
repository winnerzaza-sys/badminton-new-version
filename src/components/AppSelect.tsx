import { Children, isValidElement, useId, type ReactNode } from "react";
import { Select } from "antd";

type Props = {
  children: ReactNode;
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
  id?: string;
  "aria-label"?: string;
};

/** Shared Select styling; existing option declarations remain readable JSX. */
export function AppSelect({
  children,
  value,
  onChange,
  searchable,
  ...props
}: Props) {
  const id = useId();
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value: string | number; children: ReactNode }>(child))
      return [];
    return [{ value: String(child.props.value), label: child.props.children }];
  });
  return (
    <Select
      {...props}
      id={props.id ?? id}
      className="app-select"
      value={String(value)}
      onChange={onChange}
      options={options}
      showSearch={
        (searchable ?? options.length > 4)
          ? { optionFilterProp: "label" }
          : false
      }
      optionRender={(option) => (
        <span data-option-value={option.value}>{option.label}</span>
      )}
      virtual={false}
      popupMatchSelectWidth
      styles={{ popup: { root: { maxWidth: "calc(100vw - 24px)" } } }}
    />
  );
}
