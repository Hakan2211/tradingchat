import { Toaster as Sonner, type ToasterProps } from 'sonner';

// This is the key change:
// We are NOT importing `useTheme` from `next-themes`.
// Instead, we accept `theme` as a prop, which is already part of ToasterProps.

const Toaster = ({ theme, ...props }: ToasterProps) => {
  return (
    <Sonner
      // We use the theme passed in from the props.
      // This will come from your root loader!
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      // We keep the shadcn/ui styling method that uses CSS variables,
      // since you have them set up in globals.css.
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
