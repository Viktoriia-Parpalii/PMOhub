const fs = require('fs');
let content = fs.readFileSync('./src/components/BacklogTab.tsx', 'utf8');

const duplicate = `                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}

                  </React.Fragment>
                );
              })}`;

content = content.replace(duplicate, `                  </React.Fragment>
                );
              })}`);
              
fs.writeFileSync('./src/components/BacklogTab.tsx', content, 'utf8');
