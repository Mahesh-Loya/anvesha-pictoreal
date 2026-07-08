export function validateConfig(cfg) {
  const totalPages = cfg.tiers.reduce((sum, tier) => sum + tier.pages.length, 0);
  const expected = cfg.fragments.rows * cfg.fragments.cols;
  const errors = [];
  if (expected !== totalPages) {
    errors.push(
      `fragments.rows (${cfg.fragments.rows}) * cols (${cfg.fragments.cols}) = ${expected}, but total pages = ${totalPages}`
    );
  }
  return { valid: errors.length === 0, totalPages, errors };
}
