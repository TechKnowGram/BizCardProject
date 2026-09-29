import pytest
from pydantic import ValidationError
from app.schemas.auth import RegisterRequest, LoginRequest


@pytest.mark.parametrize('password', [
    'lowercase1!', 'UPPERCASE1!', 'NoNumber!', 'NoSpecial1', 'Short1!',
])
def test_registration_rejects_weak_password(password):
    with pytest.raises(ValidationError):
        RegisterRequest(username='Owner', company_name='Example', email='owner@gmail.com', password=password)


def test_registration_rejects_invalid_email():
    with pytest.raises(ValidationError):
        RegisterRequest(username='Owner', company_name='Example', email='invalid', password='Strong@123')


def test_registration_accepts_strong_password_and_normalizes_email():
    payload = RegisterRequest(
        username='Owner', company_name='Example', email='Owner@GMAIL.COM', password='Strong@123'
    )
    assert payload.email == 'owner@gmail.com'


@pytest.mark.parametrize('email', ['zz@gm.com', 'owner@gmail.co', 'owner@outlook.com'])
def test_registration_requires_exact_gmail_domain(email):
    with pytest.raises(ValidationError):
        RegisterRequest(username='Owner', company_name='Example', email=email, password='Strong@123')


def test_login_keeps_existing_passwords_compatible():
    assert LoginRequest(email='owner@example.com', password='12345678').password == '12345678'
