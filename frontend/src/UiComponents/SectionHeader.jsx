import styles from "./SectionHeader.module.css";

export default function SectionHeader({ children }) {
  return (
    <div className={styles.SectionHeader}>
      {children}
    </div>
  );
}