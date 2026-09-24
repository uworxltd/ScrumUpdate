package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.service.RoleService;
import uk.co.uworx.khoji.agile.persistence.model.Roles;
import uk.co.uworx.khoji.agile.persistence.repository.RolesRepository;

import java.util.List;
import java.util.Optional;

@Service
public class RolesDataService implements RoleService
{
  @Autowired
  private RolesRepository rolesRepository;

  @Override
  public Roles createRole(Roles role)
  {
    if (
            rolesRepository
                    .getByCode(role.getCode())
                    .isPresent()
    ) throw new ServiceException(ServiceError.R0000);

    if (
            rolesRepository
                    .getByName(role.getName())
                    .isPresent()
    ) throw new ServiceException(ServiceError.R0001);


    return rolesRepository.save(role);
  }

  @Override
  public Roles updateRole(Roles role)
  {
    return null;
  }

  @Override
  public List<Roles> getRoles()
  {
    return rolesRepository.findAll();
  }

  @Override
  public Optional<Roles> getRoleById(Long id)
  {
    return rolesRepository.findById(id);
  }

  @Override
  public Roles getRoleByCode(String code)
  {
    return rolesRepository.getByCode(code).orElse(null);
  }
}
