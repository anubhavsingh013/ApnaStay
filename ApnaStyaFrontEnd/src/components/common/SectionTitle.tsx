interface SectionTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const SectionTitle = ({ title, subtitle, className = "" }: SectionTitleProps) => (
  <div className={`text-center mb-10 ${className}`}>
    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{title}</h2>
    {subtitle && <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>}
  </div>
);

export default SectionTitle;
