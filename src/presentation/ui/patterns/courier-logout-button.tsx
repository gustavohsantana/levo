export function CourierLogoutButton() {
  return (
    <a
      href="/entregador/sair"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 32,
        padding: '0 10px',
        borderRadius: 5,
        color: '#6b675f',
        fontSize: 12,
        fontWeight: 500,
        textDecoration: 'none',
        fontFamily: 'inherit',
      }}
    >
      Sair
    </a>
  );
}
