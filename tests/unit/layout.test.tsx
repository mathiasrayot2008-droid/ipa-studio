import { render, screen } from '@testing-library/react';
import { AppRoutes } from '@/app/routes';

describe('layout', () => {
  it('affiche les entrées de navigation principales', () => {
    render(<AppRoutes />);
    expect(screen.getAllByRole('link', { name: /Tableau de bord/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /TP Schooding/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('navigation', { name: /Navigation principale/ })).toHaveLength(2);
  });
});
