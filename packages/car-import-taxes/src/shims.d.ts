declare module "react" {
  export type ReactNode = unknown
  export function useId(): string
  export type FC<P = Record<string, unknown>> = (props: P & {
    children?: ReactNode
  }) => ReactNode
  export type ChangeEvent<T = { value: string }> = { target: T }
  export type FormEvent<T = unknown> = { target: T }
  export type Dispatch<A> = (value: A) => void
  export type SetStateAction<S> = S | ((prevState: S) => S)

  const React: {
    useId: typeof useId
  }

  export default React
}

declare module "react/jsx-runtime" {
  export const Fragment: unique symbol
  export function jsx(type: unknown, props: Record<string, unknown>, key?: unknown): unknown
  export function jsxs(type: unknown, props: Record<string, unknown>, key?: unknown): unknown
  export function jsxDEV(
    type: unknown,
    props: Record<string, unknown>,
    key?: unknown,
    isStaticChildren?: boolean,
    source?: unknown,
    self?: unknown,
  ): unknown
}

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>
  }
}

declare module "@workspace/ui/components/input" {
  export interface InputProps {
    [key: string]: unknown
    children?: unknown
  }
  export function Input(props: InputProps): unknown
}

declare module "@workspace/ui/components/label" {
  export interface LabelProps {
    [key: string]: unknown
    children?: unknown
  }
  export function Label(props: LabelProps): unknown
}

declare module "@workspace/ui/components/checkbox" {
  export interface CheckboxProps {
    checked?: boolean | "indeterminate"
    onCheckedChange?: (checked: boolean | "indeterminate" | undefined) => void
    [key: string]: unknown
    children?: unknown
  }
  export function Checkbox(props: CheckboxProps): unknown
}

declare module "@workspace/ui/components/card" {
  export interface CardProps {
    [key: string]: unknown
    children?: unknown
  }
  export function Card(props: CardProps): unknown

  export type CardHeaderProps = CardProps
  export function CardHeader(props: CardHeaderProps): unknown

  export type CardTitleProps = CardProps
  export function CardTitle(props: CardTitleProps): unknown

  export type CardDescriptionProps = CardProps
  export function CardDescription(props: CardDescriptionProps): unknown

  export type CardContentProps = CardProps
  export function CardContent(props: CardContentProps): unknown
}

declare module "@workspace/ui/lib/utils" {
  export function cn(...inputs: Array<string | number | boolean | null | undefined>): string
}
