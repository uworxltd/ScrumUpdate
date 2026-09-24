/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.helper;

import lombok.extern.log4j.Log4j2;
import org.springframework.core.io.ClassPathResource;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.util.Base64;

import static uk.co.uworx.khoji.agile.constants.EncryptionConstants.ENCRYPTION_ALGORITHM;
import static uk.co.uworx.khoji.agile.constants.EncryptionConstants.ENCRYPTION_KEY_ALGORITHM;
import static uk.co.uworx.khoji.agile.constants.EncryptionConstants.ENCRYPTION_TYPE;
import static uk.co.uworx.khoji.agile.constants.EncryptionConstants.ENCRYPT_KEY_ALIAS;
import static uk.co.uworx.khoji.agile.constants.EncryptionConstants.KEY_PASSWORD;
import static uk.co.uworx.khoji.agile.constants.EncryptionConstants.KEY_STORE_LOCATION;
import static uk.co.uworx.khoji.agile.constants.EncryptionConstants.KEY_STORE_PASSWORD;
import static uk.co.uworx.khoji.agile.constants.EncryptionConstants.KEY_STORE_TYPE;
import static uk.co.uworx.khoji.agile.constants.EncryptionConstants.SALT_KEY_ALIAS;

@Log4j2
public class EncryptionHelper
{
  private static final String SECRET_KEY = getSecretKey(ENCRYPT_KEY_ALIAS);
  private static final String SALT = getSecretKey(SALT_KEY_ALIAS);
  private static final IvParameterSpec ivParameterSpec = new IvParameterSpec(new byte[16]);

  public static String encrypt(String strToEncrypt)
  {
    try
    {
      SecretKeySpec secretKey = getSecretKeySpec();

      Cipher cipher = Cipher.getInstance(ENCRYPTION_ALGORITHM);
      cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivParameterSpec);
      return Base64.getEncoder().encodeToString(cipher.doFinal(strToEncrypt.getBytes(StandardCharsets.UTF_8)));
    }
    catch (Exception exception)
    {
      log.error("Error while encrypting: ", exception);
    }
    return null;
  }

  public static String decrypt(String strToDecrypt)
  {
    try
    {
      SecretKeySpec secretKey = getSecretKeySpec();

      Cipher cipher = Cipher.getInstance(ENCRYPTION_ALGORITHM);
      cipher.init(Cipher.DECRYPT_MODE, secretKey, ivParameterSpec);
      return new String(cipher.doFinal(Base64.getDecoder().decode(strToDecrypt)));
    }
    catch (Exception exception)
    {
      log.error("Error while decrypting: ", exception);
    }
    return null;
  }

  private static SecretKeySpec getSecretKeySpec() throws NoSuchAlgorithmException, InvalidKeySpecException
  {
    SecretKeyFactory factory = SecretKeyFactory.getInstance(ENCRYPTION_KEY_ALGORITHM);
    KeySpec spec = new PBEKeySpec(SECRET_KEY.toCharArray(), SALT.getBytes(), 65536, 128);
    SecretKey tmp = factory.generateSecret(spec);
    return new SecretKeySpec(tmp.getEncoded(), ENCRYPTION_TYPE);
  }

  private static String getSecretKey(String keyAlias)
  {
    Key key;
    try
    {
      InputStream keystoreStream = new ClassPathResource(KEY_STORE_LOCATION).getInputStream();
      KeyStore keystore = KeyStore.getInstance(KEY_STORE_TYPE);
      keystore.load(keystoreStream, KEY_STORE_PASSWORD.toCharArray());
      if (!keystore.containsAlias(keyAlias))
      {
        log.error("Alias for key not found");
        throw new RuntimeException("Alias for key not found");
      }
      key = keystore.getKey(keyAlias, KEY_PASSWORD.toCharArray());
      return key.toString();
    }
    catch (KeyStoreException | IOException | NoSuchAlgorithmException | CertificateException |
           UnrecoverableKeyException exception)
    {
      log.error("Error while reading key store: ", exception);
    }

    return null;
  }

}
